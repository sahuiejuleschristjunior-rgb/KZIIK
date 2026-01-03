const fs = require("fs");
const path = require("path");
const Page = require("../models/Page");
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");
const { validatePageName, generatePageSlug } = require("../utils/pageNameRules");
const { buildMediaPayload } = require("../utils/mediaPayloadBuilder");
const {
  fetchActiveCampaigns,
  injectSponsoredPosts,
} = require("../utils/sponsoredFeedHelper");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function generateUniqueSlug(name) {
  let base = generatePageSlug(name) || "page";
  let slug = base;
  let counter = 1;

  while (await Page.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

function canManagePage(page, userId) {
  if (!page || !userId) return false;
  if (String(page.owner) === String(userId)) return true;
  return (page.admins || []).some((id) => String(id) === String(userId));
}

function normalizeCategories(input) {
  if (input === undefined || input === null) return [];

  const raw = Array.isArray(input) ? input : [input];
  const unique = [];

  raw
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter(Boolean)
    .forEach((c) => {
      if (!unique.includes(c)) unique.push(c);
    });

  if (unique.length > 3) {
    throw new Error("Max 3 categories autorisées");
  }

  return unique;
}

async function pushPageFollowNotification(targetUserId, fromUserId, pageId) {
  if (String(targetUserId) === String(fromUserId)) return null;

  const existing = await Notification.findOne({
    userId: targetUserId,
    from: fromUserId,
    type: "public",
    actionType: "page_follow",
    relatedId: pageId,
  });

  if (existing) return existing;

  const notif = await Notification.create({
    userId: targetUserId,
    from: fromUserId,
    type: "public",
    actionType: "page_follow",
    relatedId: pageId,
    text: "A commencé à suivre votre page.",
  });

  try {
    getIO().to(String(targetUserId)).emit("notification:new", notif);
  } catch (err) {}

  return notif;
}

exports.createPage = async (req, res) => {
  try {
    const {
      name,
      bio = "",
      website = "",
      phone = "",
      whatsapp = "",
      location = "",
      contact = "",
    } = req.body;

    let categories;
    try {
      categories = normalizeCategories(req.body.categories ?? req.body.category);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!name || categories.length === 0) {
      return res.status(400).json({ error: "Nom et catégorie requis" });
    }

    const nameValidation = validatePageName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }

    const normalizedName = nameValidation.value;

    const ownerId = req.user?.id;
    if (!ownerId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const slug = await generateUniqueSlug(normalizedName);

    await Page.create({
      owner: ownerId,
      admins: [ownerId],
      name: normalizedName,
      slug,
      category: categories[0],
      categories,
      bio,
      website,
      phone,
      whatsapp,
      location,
      contact,
    });

    res.status(201).json({ slug });
  } catch (err) {
    res.status(500).json({ error: "Erreur création page" });
  }
};

exports.getMyPages = async (req, res) => {
  try {
    const pages = await Page.find({
      $or: [{ owner: req.userId }, { admins: req.userId }],
    }).sort({ createdAt: -1 });

    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: "Erreur chargement pages" });
  }
};

exports.getPageBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = await Page.findOne({ slug }).populate("owner", "name avatar");

    if (!page) return res.status(404).json({ error: "Page introuvable" });

    const isAdmin = canManagePage(page, req.userId);
    const isFollowing = (page.followers || []).some(
      (f) => String(f) === String(req.userId)
    );

    res.json({
      page,
      permissions: { isAdmin },
      isFollowing,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur chargement page" });
  }
};

exports.updatePage = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = await Page.findOne({ slug });

    if (!page) return res.status(404).json({ error: "Page introuvable" });
    if (!canManagePage(page, req.userId)) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    if (req.body.name !== undefined) {
      const nameValidation = validatePageName(req.body.name);
      if (!nameValidation.valid) {
        return res.status(400).json({ error: nameValidation.error });
      }

      page.name = nameValidation.value;
    }

    const allowedFields = ["bio", "website", "phone", "whatsapp", "location", "contact"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        page[field] = req.body[field];
      }
    });

    if (req.body.categories !== undefined || req.body.category !== undefined) {
      let categories;
      try {
        categories = normalizeCategories(req.body.categories ?? req.body.category);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      if (categories.length === 0) {
        return res.status(400).json({ error: "Au moins une catégorie requise" });
      }

      page.categories = categories;
      page.category = categories[0];
    }

    await page.save();
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour page" });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = await Page.findOne({ slug });
    if (!page) return res.status(404).json({ error: "Page introuvable" });
    if (!canManagePage(page, req.userId)) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    if (!req.file) return res.status(400).json({ error: "Fichier requis" });

    page.avatar = "/uploads/" + req.file.filename;
    await page.save();

    res.json({ avatar: page.avatar });
  } catch (err) {
    res.status(500).json({ error: "Erreur upload avatar" });
  }
};

exports.uploadCover = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = await Page.findOne({ slug });
    if (!page) return res.status(404).json({ error: "Page introuvable" });
    if (!canManagePage(page, req.userId)) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    if (!req.file) return res.status(400).json({ error: "Fichier requis" });

    page.coverPhoto = "/uploads/" + req.file.filename;
    await page.save();

    res.json({ coverPhoto: page.coverPhoto });
  } catch (err) {
    res.status(500).json({ error: "Erreur upload cover" });
  }
};

exports.toggleFollow = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = await Page.findOne({ slug });
    if (!page) return res.status(404).json({ error: "Page introuvable" });

    const already = (page.followers || []).some(
      (f) => String(f) === String(req.userId)
    );

    const user = await User.findById(req.userId);

    if (already) {
      page.followers = page.followers.filter(
        (f) => String(f) !== String(req.userId)
      );
      page.followersCount = Math.max(0, (page.followersCount || 0) - 1);

      if (user) {
        user.followingPages = (user.followingPages || []).filter(
          (p) => String(p) !== String(page._id)
        );
        await user.save();
      }

      await page.save();
      return res.json({ following: false, followersCount: page.followersCount });
    }

    page.followers = [...(page.followers || []), req.userId];
    page.followersCount = (page.followersCount || 0) + 1;
    await page.save();

    if (user) {
      const set = new Set((user.followingPages || []).map(String));
      set.add(String(page._id));
      user.followingPages = Array.from(set);
      await user.save();
    }

    await pushPageFollowNotification(page.owner, req.userId, page._id);

    res.json({ following: true, followersCount: page.followersCount });
  } catch (err) {
    res.status(500).json({ error: "Erreur follow page" });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = await Page.findOne({ slug });
    if (!page) return res.status(404).json({ error: "Page introuvable" });

    const pageNum = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (pageNum - 1) * limit;

    const followers = await User.find({ _id: { $in: page.followers || [] } })
      .select("name email avatar")
      .skip(skip)
      .limit(limit);

    res.json({
      followers,
      total: page.followers?.length || 0,
      page: pageNum,
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur followers" });
  }
};

exports.searchPages = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const regex = new RegExp(q, "i");

    const pages = await Page.find({
      $or: [{ name: regex }, { slug: regex }, { category: regex }],
    })
      .select("name slug category avatar followersCount")
      .limit(20);

    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: "Erreur recherche" });
  }
};

exports.createPagePost = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = await Page.findOne({ slug });
    if (!page) return res.status(404).json({ error: "Page introuvable" });
    if (!canManagePage(page, req.userId)) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const text = typeof req.body.text === "string" ? req.body.text : "";
    let media = [];

    if (req.body.media) {
      try {
        media = Array.isArray(req.body.media)
          ? req.body.media
          : JSON.parse(req.body.media);
      } catch (err) {
        media = [];
      }
    }

    if (req.files?.length) {
      const uploaded = req.files
        .map((file) => buildMediaPayload(file))
        .filter(Boolean);
      media = [...media, ...uploaded];
    }

    const created = await Post.create({
      user: req.userId,
      page: page._id,
      authorType: "page",
      text,
      media,
    });

    const post = await Post.findById(created._id)
      .populate("user", "name email avatar avatarColor")
      .populate("page", "name slug avatar")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:new", post);

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Erreur création post page" });
  }
};

exports.getPagePosts = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = await Page.findOne({ slug });
    if (!page) return res.status(404).json({ error: "Page introuvable" });

    const pageNum = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (pageNum - 1) * limit;

    const total = await Post.countDocuments({ page: page._id });

    const posts = await Post.find({ page: page._id })
      .populate("user", "name email avatar avatarColor")
      .populate("page", "name slug avatar")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const includeAds =
      String(req.query.includeAds || "").toLowerCase() === "1" ||
      String(req.query.includeAds || "").toLowerCase() === "true";

    let finalPosts = posts;
    if (includeAds) {
      const { adPosts, campaignByPost } = await fetchActiveCampaigns();
      finalPosts = injectSponsoredPosts(posts, adPosts, campaignByPost);
    }

    res.json({
      posts: finalPosts,
      total,
      hasMore: skip + posts.length < total,
      page: pageNum,
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur posts page" });
  }
};
