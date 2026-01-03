const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

/* ============================================================
   UTILITAIRES DE CONFIGURATION SMTP
============================================================ */
const hasCredentials = (user, pass) => Boolean((user || "").trim() && (pass || "").trim());

const isSmtpConfigured = (fromType) => {
  const user =
    fromType === "inscription"
      ? process.env.SMTP_USER_INSCRIPTION
      : process.env.SMTP_USER_NO_REPLY;

  const pass =
    fromType === "inscription"
      ? process.env.SMTP_PASS_INSCRIPTION
      : process.env.SMTP_PASS_NO_REPLY;

  return (
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_PORT) &&
    hasCredentials(user, pass) &&
    Boolean(
      fromType === "inscription"
        ? process.env.FROM_EMAIL_INSCRIPTION
        : process.env.FROM_EMAIL_NO_REPLY
    )
  );
};

const buildTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER_INSCRIPTION,
      pass: process.env.SMTP_PASS_INSCRIPTION,
    },
  });

const buildNoReplyTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER_NO_REPLY,
      pass: process.env.SMTP_PASS_NO_REPLY,
    },
  });

/* ============================================================
   1. TRANSPORT SMTP POUR INSCRIPTION
============================================================ */
const transporterInscription = buildTransporter();

/* ============================================================
   2. TRANSPORT SMTP POUR NO-REPLY
============================================================ */
const transporterNoReply = buildNoReplyTransporter();

/* ============================================================
   3. VÉRIFICATION SMTP SÉCURISÉE (NE PLANTE PLUS LE SERVEUR)
============================================================ */
(async () => {
  try {
    if (isSmtpConfigured("inscription")) {
      await transporterInscription.verify();
      console.log("✔ SMTP INSCRIPTION CONNECTED");
    } else {
      console.warn("⚠️ SMTP inscription non configuré. Envoi d'email désactivé.");
    }
  } catch (err) {
    console.error("❌ SMTP INSCRIPTION ERROR:", err.message);
  }

  try {
    if (isSmtpConfigured("noreply")) {
      await transporterNoReply.verify();
      console.log("✔ SMTP NO-REPLY CONNECTED");
    } else {
      console.warn("⚠️ SMTP no-reply non configuré. Envoi d'email désactivé.");
    }
  } catch (err) {
    console.error("❌ SMTP NO-REPLY ERROR:", err.message);
  }
})();

/* ============================================================
   4. ENVOI D’UN EMAIL HTML AVEC TEMPLATE
============================================================ */

exports.sendTemplateEmail = async (
  templateName,
  to,
  subject,
  variables = {},
  fromType = "noreply" // "inscription" OU "noreply"
) => {
  try {
    // Choix du transport SMTP
    const transporter =
      fromType === "inscription"
        ? transporterInscription
        : transporterNoReply;

    // Adresse expéditeur
    const from =
      fromType === "inscription"
        ? process.env.FROM_EMAIL_INSCRIPTION
        : process.env.FROM_EMAIL_NO_REPLY;

    if (!isSmtpConfigured(fromType)) {
      console.warn(
        `⚠️ SMTP (${fromType}) non configuré : email '${subject}' vers ${to} ignoré.`
      );
      return { success: false, skipped: true };
    }

    console.log("SMTP_LOG", { to, subject });

    // Chemin du template
    const templatePath = path.join(__dirname, "../templates", templateName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template introuvable : ${templateName}`);
    }

    // Charger et remplir le template HTML
    let html = fs.readFileSync(templatePath, "utf8");

    for (const key in variables) {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
    }

    // Envoi du mail
    console.log("EMAIL SEND ATTEMPT", {
      to,
      subject,
      from,
      template: templateName,
      fromType,
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT OK", { to, subject, messageId: info?.messageId || null });
    return { success: true, info };
  } catch (err) {
    console.error("EMAIL ERROR", err.message || err);
    // Ne plus bloquer l'API si le SMTP est HS : on log et on continue
    return { success: false, error: err.message || String(err) };
  }
};
