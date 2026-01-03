const Notification = require("../models/Notification");
const { io } = require("../server");

async function createNotificationAndEmit({
  userId,
  type,
  actionType,
  relatedId,
  text,
  from,
}) {
  const notif = await Notification.create({
    userId,
    type,
    actionType,
    relatedId,
    text: text || "",
    from: from || null,
  });

  io.to(userId.toString()).emit("notification:new", notif);

  return notif;
}

module.exports = { createNotificationAndEmit };
