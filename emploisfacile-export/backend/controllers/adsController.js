const Post = require("../models/Post");
const Page = require("../models/Page");
const SponsoredPost = require("../models/SponsoredPost");
const { isCampaignActive } = require("../utils/sponsoredFeedHelper");
const mailer = require("../utils/mailer");

function canManagePage(page, userId) {
  if (!page || !userId) return false;
  if (String(page.owner) === String(userId)) return true;
  return (page.admins || []).some((id) => String(id) === String(userId));
}

async function ensurePostOwnership(post, userId, userRole = null) {
  if (!post) return false;
  if (userRole === "admin") return true;

  if (post.authorType === "page" && post.page) {
    const page = await Page.findById(post.page);
    return canManagePage(page, userId);
  }

  return String(post.user) === String(userId);
}

async function updatePostFlag(postId, value) {
  if (!postId) return;
  await Post.findByIdAndUpdate(postId, { isSponsored: value });
}

async function refreshPostFlagForCampaign(postId) {
  if (!postId) return;
  const activeCount = await SponsoredPost.countDocuments({
    post: postId,
    status: "active",
    startDate: { $lte: new Date() },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: new Date() } },
    ],
  });

  await updatePostFlag(postId, activeCount > 0);
}

function sanitizeBudget(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(parsed)) return 0;
  return parsed;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateRange(startDate, endDate) {
  if (startDate && endDate) {
    return `${new Date(startDate).toLocaleDateString()} → ${new Date(endDate).toLocaleDateString()}`;
  }
  return startDate || endDate
    ? new Date(startDate || endDate).toLocaleDateString()
    : "Dates non définies";
}

function buildPaymentLink(campaignId) {
  if (!campaignId) return "";
  const base = process.env.FRONTEND_URL || "https://emploisfacile.org";
  return `${base}/fb/ads/pay/${campaignId}`;
}

async function resolveCampaignRecipient(campaign) {
  try {
    if (!campaign) return { email: null, name: null, firstName: null };

    if (!campaign.post?.user?.email) {
      await campaign.populate({
        path: "post",
        populate: [{ path: "user", select: "name email" }, { path: "page", select: "name owner" }],
      });
    }

    const postUserEmail = campaign.post?.user?.email;
    if (postUserEmail) {
      const name = campaign.post?.user?.name || "client";
      return { email: postUserEmail, name, firstName: name.split(" ")[0] || "client" };
    }

    if (campaign.ownerType === "page" && campaign.owner) {
      let page = campaign.owner;
      if (!page?.owner?.email) {
        page = await Page.findById(campaign.owner).populate({ path: "owner", select: "name email" });
      }

      const pageOwner = page?.owner;
      if (pageOwner?.email) {
        const name = pageOwner.name || "client";
        return { email: pageOwner.email, name, firstName: name.split(" ")[0] || "client" };
      }
    }

    return { email: null, name: null, firstName: null };
  } catch (err) {
    console.error("ADS EMAIL RECIPIENT ERROR", err.message || err);
    return { email: null, name: null, firstName: null };
  }
}

async function sendAdReviewStartedEmail(campaign) {
  try {
    if (!campaign || campaign.status !== "review") return;
    if (campaign.review?.emailSentAt) return;

    const recipient = await resolveCampaignRecipient(campaign);

    if (!recipient.email) {
      console.log("ADS_EMAIL_MISSING_RECIPIENT", {
        campaignId: String(campaign._id || ""),
        phase: "review",
      });
      return;
    }

    const variables = {
      firstName: recipient.firstName || "client",
      objective: campaign.objective || "Non spécifié",
      budget: `${campaign.budgetTotal || 0} FCFA`,
      dates: formatDateRange(campaign.startDate, campaign.endDate),
    };

    await mailer.sendTemplateEmail(
      "ads_review_started.html",
      recipient.email,
      "Votre publicité est en cours de validation",
      variables,
      "noreply"
    );

    console.log("ADS_EMAIL_REVIEW_SENT", {
      campaignId: String(campaign._id || ""),
      to: recipient.email,
    });

    campaign.review = {
      ...(campaign.review || {}),
      emailSentAt: new Date(),
    };
    await campaign.save();
  } catch (err) {
    console.error("ADS REVIEW EMAIL ERROR", err.message || err);
  }
}

async function maybeSendAwaitingPaymentEmail(campaign) {
  try {
    console.log("EMAIL_TRIGGER_CALLED");

    if (!campaign) {
      console.log("EMAIL_STATUS", "NO_CAMPAIGN");
      return;
    }

    console.log("EMAIL_CAMPAIGN_ID", String(campaign._id || ""));
    console.log("EMAIL_STATUS", campaign.status || "NO_STATUS");

    if (campaign.status !== "awaiting_payment") {
      console.log("EMAIL_STATUS", "INVALID_STATUS");
      return;
    }

    if (!campaign.payment?.emailSentAt && (!campaign.post || !campaign.post.user)) {
      await campaign.populate({ path: "post", populate: [{ path: "user", select: "name email" }] });
    }

    if (campaign.payment?.emailSentAt) {
      console.log("EMAIL_STATUS", "ALREADY_SENT");
      return;
    }

    const recipient = await resolveCampaignRecipient(campaign);
    console.log("EMAIL_TO", recipient.email || "MISSING_RECIPIENT");
    if (!recipient.email) {
      console.log("ADS_EMAIL_MISSING_RECIPIENT", {
        campaignId: String(campaign._id || ""),
        phase: "awaiting_payment",
      });
      return;
    }

    const variables = {
      firstName: recipient.firstName || "client",
      objective: campaign.objective || "Non spécifié",
      audience: campaign.audience?.country || "Audience non définie",
      budget: `${campaign.budgetTotal || 0} FCFA`,
      dates: formatDateRange(campaign.startDate, campaign.endDate),
      paymentLink: campaign.payment?.link || buildPaymentLink(campaign._id),
    };

    await mailer.sendTemplateEmail(
      "ads_payment_ready.html",
      recipient.email,
      "Votre publicité est prête — Paiement requis",
      variables,
      "noreply"
    );

    console.log("EMAIL_STATUS", "SEND_OK");
    console.log("ADS_EMAIL_PAYMENT_SENT", {
      campaignId: String(campaign._id || ""),
      to: recipient.email,
    });

    campaign.payment = campaign.payment || {};
    campaign.payment.emailSentAt = new Date();
    await campaign.save();
  } catch (err) {
    console.error("ADS PAYMENT EMAIL ERROR", err.message || err);
  }
}

async function maybeFinalizeReview(campaign) {
  try {
    if (!campaign || campaign.status !== "review") return campaign;
    const reviewEndsAt = campaign.review?.endsAt ? new Date(campaign.review.endsAt) : null;
    if (!reviewEndsAt || Number.isNaN(reviewEndsAt.getTime())) return campaign;
    if (reviewEndsAt.getTime() > Date.now()) return campaign;

    console.log("ADS_AUTO_ADVANCE", {
      id: String(campaign._id || ""),
      from: "review",
      to: "awaiting_payment",
    });

    campaign.status = "awaiting_payment";
    await campaign.save();
    await maybeSendAwaitingPaymentEmail(campaign);
  } catch (err) {
    console.error("ADS AUTO AWAITING PAYMENT ERROR", err.message || err);
  }

  return campaign;
}

exports.create = async (req, res) => {
  try {
    const { postId } = req.params;
    const body = req.body || {};
    const allowedStatus = ["draft", "review", "awaiting_payment", "active", "paused", "ended"];

    const post = await Post.findById(postId).populate("user");
    if (!post) return res.status(404).json({ ok: false, error: "Post introuvable" });

    const canSponsor = await ensurePostOwnership(post, req.userId, req.user?.role);
    if (!canSponsor) {
      return res.status(403).json({ ok: false, error: "Accès refusé" });
    }

    const status = allowedStatus.includes(body.status) ? body.status : "review";
    const reviewStartedAt = normalizeDate(body.review?.startedAt) || new Date();
    const reviewEndsAt = normalizeDate(body.review?.endsAt);
    const creativePayload =
      body.creative && typeof body.creative === "object"
        ? body.creative
        : { text: "", link: "", media: [] };
    const audiencePayload = body.audience && typeof body.audience === "object" ? body.audience : {};

    const campaign = await SponsoredPost.create({
      post: post._id,
      ownerType: post.authorType === "page" ? "page" : "user",
      owner: post.authorType === "page" ? post.page : post.user,
      status,
      creative: creativePayload,
      objective: body.objective || null,
      audience: audiencePayload,
      budgetTotal: sanitizeBudget(body.budgetTotal),
      budgetDaily: sanitizeBudget(body.budgetDaily),
      startDate: normalizeDate(body.startDate) || new Date(),
      endDate: normalizeDate(body.endDate),
      targeting: body.targeting || null,
      review: {
        startedAt: reviewStartedAt,
        endsAt: reviewEndsAt,
        emailSentAt: null,
      },
      payment: {
        amount: sanitizeBudget(body.payment?.amount || body.budgetTotal),
        currency: "FCFA",
        link: "",
        status: body.payment?.status === "paid" ? "paid" : "pending",
        emailSentAt: body.payment?.emailSentAt || null,
      },
    });

    // Inject payment link once we have the ID
    campaign.payment.link = buildPaymentLink(campaign._id);
    await campaign.save();

    if (status === "review") {
      await sendAdReviewStartedEmail(campaign);
    }

    if (status === "awaiting_payment") {
      await maybeSendAwaitingPaymentEmail(campaign);
    }

    if (status === "active" && isCampaignActive(campaign)) {
      await updatePostFlag(post._id, true);
    }

    res.status(201).json({ ok: true, data: campaign });
  } catch (err) {
    console.error("ADS CREATE ERROR", err.message || err);
    res.status(500).json({ ok: false, error: "Erreur création campagne" });
  }
};

exports.getMy = async (req, res) => {
  try {
    const managedPages = await Page.find({
      $or: [{ owner: req.userId }, { admins: req.userId }],
    }).select("_id");

    const pageIds = managedPages.map((p) => p._id);

    const campaigns = await SponsoredPost.find({
      $or: [
        { ownerType: "user", owner: req.userId },
        { ownerType: "page", owner: { $in: pageIds } },
      ],
    })
      .populate({ path: "post", populate: [{ path: "page", select: "name slug" }, { path: "user", select: "name" }] })
      .sort({ createdAt: -1 });

    const refreshedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const finalized = await maybeFinalizeReview(campaign);
        if (finalized.status === "awaiting_payment" && !finalized.payment?.emailSentAt) {
          await maybeSendAwaitingPaymentEmail(finalized);
        }
        return finalized;
      })
    );

    res.json({ ok: true, data: refreshedCampaigns });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Erreur chargement campagnes" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await SponsoredPost.findById(id).populate({
      path: "post",
      populate: [
        { path: "user", select: "name email avatar" },
        { path: "page", select: "name slug avatar" },
      ],
    });

    if (!campaign) return res.status(404).json({ ok: false, error: "Campagne introuvable" });

    const ownerOk = await ensurePostOwnership(campaign.post, req.userId, req.user?.role);
    if (!ownerOk) return res.status(403).json({ ok: false, error: "Accès refusé" });

    const refreshedCampaign = await maybeFinalizeReview(campaign);
    if (refreshedCampaign.status === "awaiting_payment" && !refreshedCampaign.payment?.emailSentAt) {
      await maybeSendAwaitingPaymentEmail(refreshedCampaign);
    }

    res.json({ ok: true, data: refreshedCampaign });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Erreur chargement campagne" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review, payment, archived, endedAt } = req.body || {};
    const allowedStatus = ["draft", "review", "awaiting_payment", "active", "paused", "ended"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ ok: false, error: "Statut invalide" });
    }

    const campaign = await SponsoredPost.findById(id).populate({
      path: "post",
      populate: [{ path: "user", select: "name email" }],
    });
    if (!campaign) return res.status(404).json({ ok: false, error: "Campagne introuvable" });

    const ownerOk = await ensurePostOwnership(campaign.post, req.userId, req.user?.role);
    if (!ownerOk) return res.status(403).json({ ok: false, error: "Accès refusé" });

    const shouldArchive = typeof archived === "boolean" ? archived : campaign.archived;
    let nextStatus = status;

    if (shouldArchive && nextStatus === "active") {
      nextStatus = "paused";
    }

    if (nextStatus === "review") {
      const currentReview = campaign.review || {};
      campaign.review = {
        startedAt: normalizeDate(review?.startedAt) || currentReview.startedAt || new Date(),
        endsAt: normalizeDate(review?.endsAt) || currentReview.endsAt || null,
        emailSentAt: currentReview.emailSentAt || null,
      };
    }

    if (nextStatus === "awaiting_payment") {
      const currentPayment = campaign.payment || {};
      campaign.payment = {
        ...currentPayment,
        amount: sanitizeBudget(payment?.amount || campaign.budgetTotal),
        currency: payment?.currency || currentPayment.currency || "FCFA",
        link: currentPayment.link || buildPaymentLink(campaign._id),
        status: "pending",
        emailSentAt: currentPayment.emailSentAt || null,
      };
      if (review?.startedAt || review?.endsAt) {
        const currentReview = campaign.review || {};
        campaign.review = {
          startedAt: normalizeDate(review?.startedAt) || currentReview.startedAt || new Date(),
          endsAt: normalizeDate(review?.endsAt) || currentReview.endsAt || null,
          emailSentAt: currentReview.emailSentAt || null,
        };
      }
    }

    if (typeof archived === "boolean") {
      campaign.archived = archived;
    }

    if (nextStatus === "ended") {
      campaign.archived = true;
      campaign.endedAt = endedAt ? new Date(endedAt) : new Date();
    }

    campaign.status = nextStatus;
    await campaign.save();

    if (campaign.status === "active" && isCampaignActive(campaign)) {
      await updatePostFlag(campaign.post, true);
    } else if (campaign.status === "paused" || campaign.status === "ended") {
      await refreshPostFlagForCampaign(campaign.post);
    }

    if (campaign.status === "review" && !campaign.review?.emailSentAt) {
      await sendAdReviewStartedEmail(campaign);
    }

    if (campaign.status === "awaiting_payment" && !campaign.payment?.emailSentAt) {
      await maybeSendAwaitingPaymentEmail(campaign);
    }

    res.json({ ok: true, data: campaign });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Erreur mise à jour statut" });
  }
};

exports.track = async (req, res) => {
  try {
    const { sponsoredPostId, type } = req.body || {};

    if (!sponsoredPostId || !["impression", "click"].includes(type)) {
      return res.status(400).json({ ok: false, error: "Payload invalide" });
    }

    const campaign = await SponsoredPost.findById(sponsoredPostId);
    if (!campaign || !isCampaignActive(campaign)) {
      return res.status(404).json({ ok: false, error: "Campagne inactive" });
    }

    const field = type === "impression" ? "stats.impressions" : "stats.clicks";

    await SponsoredPost.updateOne({ _id: sponsoredPostId }, { $inc: { [field]: 1 } });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Erreur tracking" });
  }
};
