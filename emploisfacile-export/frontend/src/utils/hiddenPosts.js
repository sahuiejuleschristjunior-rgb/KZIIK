const STORAGE_KEY = "ef_hidden_posts_v1";
const DEFAULT_USER_KEY = "guest";

const safeParse = (value) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (err) {
    return {};
  }
};

const getStore = () => {
  if (typeof window === "undefined") return {};
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

const saveStore = (data) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Storage may be full or inaccessible; fail silently
  }
};

const getUserKey = (userId) => String(userId || DEFAULT_USER_KEY);

export const getHiddenPostIds = (userId) => {
  const store = getStore();
  const key = getUserKey(userId);
  const list = store[key];
  if (!Array.isArray(list)) return [];
  return list.map(String);
};

export const rememberHiddenPost = (postId, userId) => {
  if (!postId) return;
  const key = getUserKey(userId);
  const store = getStore();
  const existing = new Set(Array.isArray(store[key]) ? store[key] : []);
  existing.add(String(postId));
  store[key] = Array.from(existing);
  saveStore(store);
};

export const filterHiddenPosts = (posts, userId) => {
  const hidden = new Set(getHiddenPostIds(userId));
  if (!Array.isArray(posts) || hidden.size === 0) return posts || [];
  return posts.filter((post) => !hidden.has(String(post?._id || post?.id)));
};
