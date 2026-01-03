const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE ?? "true").toLowerCase() === "true";

function createTransporter({ host, port, secure, user, pass }) {
  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

const credentials = {
  inscription: {
    user: process.env.SMTP_INSCRIPTION_EMAIL || process.env.SMTP_USER_INSCRIPTION,
    pass:
      process.env.SMTP_INSCRIPTION_PASSWORD || process.env.SMTP_PASS_INSCRIPTION,
  },
  noreply: {
    user: process.env.SMTP_NOREPLY_EMAIL || process.env.SMTP_USER_NO_REPLY,
    pass: process.env.SMTP_NOREPLY_PASSWORD || process.env.SMTP_PASS_NO_REPLY,
  },
};

const hasStringValue = (value) => Boolean(value && `${value}`.trim());

const buildTransporter = (type) => {
  const { user, pass } = credentials[type] || {};

  if (!hasStringValue(smtpHost) || !smtpPort || !hasStringValue(user) || !hasStringValue(pass)) {
    return null;
  }

  return createTransporter({ host: smtpHost, port: smtpPort, secure: smtpSecure, user, pass });
};

const inscriptionTransporter = buildTransporter("inscription");
const noreplyTransporter = buildTransporter("noreply");

const logStatus = async (type, transporter) => {
  if (!transporter) {
    console.warn(`⚠️ SMTP ${type} non configuré. Envoi d'email désactivé.`);
    return;
  }

  try {
    await transporter.verify();
    console.log(`✔ SMTP ${type} prêt`);
  } catch (err) {
    console.error(`❌ SMTP ${type} ERROR:`, err.message || err);
  }
};

(async () => {
  await logStatus("inscription", inscriptionTransporter);
  await logStatus("noreply", noreplyTransporter);
})();

const getFromAddress = (type) => {
  const { user } = credentials[type] || {};
  return hasStringValue(user) ? user : null;
};

module.exports = {
  createTransporter,
  inscriptionTransporter,
  noreplyTransporter,
  getFromAddress,
};
