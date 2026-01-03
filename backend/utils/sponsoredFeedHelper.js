const SponsoredPost = require("../models/SponsoredPost");
const Post = require("../models/Post");

const FEED_POPULATE = [
  { path: "user", select: "name email avatar avatarColor" },
  { path: "page", select: "name slug avatar" },
  { path: "comments.user", select: "name email avatar avatarColor" },
  { path: "comments.replies.user", select: "name email avatar avatarColor" },
];

function isCampaignActive(campaign) {
  if (!campaign || campaign.status !== "active") return false;
  const now = new Date();
  if (campaign.startDate && new Date(campaign.startDate) > now) return false;
  if (campaign.endDate && new Date(campaign.endDate) < now) return false;
  return true;
}

async function fetchActiveCampaigns() {
  const now = new Date();
  const campaigns = await SponsoredPost.find({
    status: "active",
    startDate: { $lte: now },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  });

  const postIds = campaigns.map((c) => c.post).filter(Boolean);
  if (!postIds.length) {
    return { campaigns: [], adPosts: [], campaignByPost: new Map() };
  }

  let query = Post.find({ _id: { $in: postIds } });
  FEED_POPULATE.forEach((pop) => {
    query = query.populate(pop);
  });
  const posts = await query;

  const campaignByPost = new Map();
  campaigns.forEach((c) => {
    if (!isCampaignActive(c)) return;
    const key = String(c.post);
    if (!campaignByPost.has(key)) {
      campaignByPost.set(key, c);
    }
  });

  const adPosts = posts
    .map((p) => {
      const campaign = campaignByPost.get(String(p._id));
      if (!campaign) return null;
      p.isSponsored = true;
      p.sponsoredPostId = campaign._id;
      return p;
    })
    .filter(Boolean);

  return { campaigns, adPosts, campaignByPost };
}

function injectSponsoredPosts(basePosts = [], adPosts = [], campaignByPost = new Map()) {
  const existingIds = new Set(basePosts.map((p) => String(p._id)));
  const taggedBase = basePosts.map((p) => {
    const campaign = campaignByPost.get(String(p._id));
    if (campaign) {
      p.isSponsored = true;
      p.sponsoredPostId = campaign._id;
    }
    return p;
  });

  const adsToInject = adPosts.filter((p) => !existingIds.has(String(p._id)));

  const final = [];
  let adIndex = 0;

  taggedBase.forEach((post, idx) => {
    final.push(post);
    if ((idx + 1) % 5 === 0 && adIndex < adsToInject.length) {
      final.push(adsToInject[adIndex]);
      adIndex += 1;
    }
  });

  return final;
}

module.exports = {
  FEED_POPULATE,
  fetchActiveCampaigns,
  injectSponsoredPosts,
  isCampaignActive,
};
