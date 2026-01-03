const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE ?? "true").toLowerCase() === "true";
const smtpUser = process.env.SMTP_USER || process.env.SMTP_USERNAME;
const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

const defaultFrom =
  process.env.SMTP_DEFAULT_FROM ||
  (smtpUser ? `KZIIK <${smtpUser}>` : "KZIIK <no-reply@kziik.com>");

function createTransporter({ host, port, secure, user, pass }) {
  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

const transporter = createTransporter({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  user: smtpUser,
  pass: smtpPass,
});

(async () => {
  if (!transporter) {
    console.error("❌ SMTP error: configuration incomplète (host/port/user/pass)");
    return;
  }

  try {
    await transporter.verify();
    console.log("✔ SMTP ready");
  } catch (err) {
    console.error("❌ SMTP error:", err?.message || err);
  }
})();

module.exports = {
  createTransporter,
  transporter,
  defaultFrom,
};
