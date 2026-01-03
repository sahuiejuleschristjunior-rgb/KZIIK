const User = require("../models/User");
const Post = require("../models/Post");
const Job = require("../models/Job");
const Page = require("../models/Page");

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildAccentInsensitiveRegex = (value = "") => {
  const accentMap = {
    a: "aàáâäãåāăą",
    A: "AÀÁÂÄÃÅĀĂĄ",
    c: "cçćč",
    C: "CÇĆČ",
    e: "eéèêëēĕėęě",
    E: "EÉÈÊËĒĔĖĘĚ",
    i: "iıíìîïīĭį",
    I: "IİÍÌÎÏĪĬĮ",
    n: "nñńň",
    N: "NÑŃŇ",
    o: "oóòôöõøōŏő",
    O: "OÓÒÔÖÕØŌŎŐ",
    u: "uúùûüũūŭůűų",
    U: "UÚÙÛÜŨŪŬŮŰŲ",
    y: "yýÿŷ",
    Y: "YÝŸŶ",
    s: "sśşšť",
    S: "SŚŞŠŤ",
    z: "zźżž",
    Z: "ZŹŻŽ",
  };

  const escaped = escapeRegex(value);

  const pattern = escaped.replace(/[aAcCeEiInNoOuUyYsSzZ]/g, (char) => {
    const set = accentMap[char];
    return set ? `[${set}]` : char;
  });

  return new RegExp(pattern, "i");
};

exports.globalSearch = async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query) {
      return res.json({
        users: [],
        posts: [],
        jobs: [],
        pages: [],
      });
    }

    const regex = new RegExp(query, "i");
    const pageRegex = buildAccentInsensitiveRegex(query);

    /* ======================================================
       USERS → Recherche élargie
    ====================================================== */
    const users = await User.find({
      $or: [
        { name: regex },
        { email: regex },
        { companyName: regex }
      ]
    }).select("_id name avatar");

    /* ======================================================
       POSTS → Correction du champ (content)
    ====================================================== */
    const posts = await Post.find({
      content: regex
    })
      .limit(20)
      .populate("author", "name avatar")
      .select("_id content author createdAt");


    /* ======================================================
       JOBS
    ====================================================== */
    const jobs = await Job.find({
      title: regex
    })
      .limit(20)
      .select("_id title company");

    /* ======================================================
       PAGES → Recherche accent/majuscule insensible
    ====================================================== */
    const rawPages = await Page.find({
      $or: [
        { name: pageRegex },
        { slug: pageRegex },
        { category: pageRegex },
        { categories: pageRegex },
        { bio: pageRegex },
      ],
    })
      .collation({ locale: "fr", strength: 1 })
      .limit(10)
      .select("name slug category categories avatar followersCount")
      .lean();

    const pages = rawPages.map((page) => ({
      type: "page",
      id: page._id,
      _id: page._id,
      name: page.name,
      slug: page.slug,
      category: page.category,
      categories: page.categories,
      avatar: page.avatar,
      followersCount: page.followersCount,
    }));

    res.json({ users, posts, jobs, pages });

  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Erreur serveur recherche" });
  }
};