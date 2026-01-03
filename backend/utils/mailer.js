const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

/* ============================================================
   UTILITAIRES DE CONFIGURATION SMTP
============================================================ */
const DEFAULT_SMTP_PORT = Number(process.env.SMTP_PORT || 465);

const getBaseSmtpConfig = () => ({
  host: process.env.SMTP_HOST,
  port: DEFAULT_SMTP_PORT,
  secure: String(process.env.SMTP_SECURE ?? "true").toLowerCase() === "true",
});

const getCredentials = (fromType) => {
  const fallbackUser = process.env.SMTP_USER;
  const fallbackPass = process.env.SMTP_PASS;

  if (fromType === "inscription") {
    return {
      user: process.env.SMTP_USER_INSCRIPTION || fallbackUser,
      pass: process.env.SMTP_PASS_INSCRIPTION || fallbackPass,
      from:
        process.env.FROM_EMAIL_INSCRIPTION ||
        process.env.SMTP_FROM_INSCRIPTION ||
        process.env.SMTP_USER_INSCRIPTION ||
        fallbackUser,
    };
  }

  return {
    user: process.env.SMTP_USER_NO_REPLY || fallbackUser,
    pass: process.env.SMTP_PASS_NO_REPLY || fallbackPass,
    from:
      process.env.FROM_EMAIL_NO_REPLY ||
      process.env.SMTP_FROM_NO_REPLY ||
      process.env.SMTP_USER_NO_REPLY ||
      fallbackUser,
  };
};

const hasCredentials = (user, pass) => Boolean((user || "").trim() && (pass || "").trim());

const isSmtpConfigured = (fromType) => {
  const credentials = getCredentials(fromType);
  const baseConfig = getBaseSmtpConfig();

  return (
    Boolean(baseConfig.host) &&
    Boolean(baseConfig.port) &&
    hasCredentials(credentials.user, credentials.pass) &&
    Boolean(credentials.from)
  );
};

const buildTransporter = (fromType) => {
  const baseConfig = getBaseSmtpConfig();
  const credentials = getCredentials(fromType);

  return nodemailer.createTransport({
    ...baseConfig,
    auth: {
      user: credentials.user,
      pass: credentials.pass,
    },
  });
};

/* ============================================================
   1. TRANSPORT SMTP POUR INSCRIPTION
============================================================ */
const transporterInscription = buildTransporter("inscription");

/* ============================================================
   2. TRANSPORT SMTP POUR NO-REPLY
============================================================ */
const transporterNoReply = buildTransporter("noreply");

/* ============================================================
   3. VÉRIFICATION SMTP SÉCURISÉE (NE PLANTE PLUS LE SERVEUR)
============================================================ */
const verifyTransporter = async (type, transporter) => {
  if (!isSmtpConfigured(type)) {
    console.warn(
      `⚠️ SMTP ${type} non configuré. Envoi d'email désactivé pour ce profil.`
    );
    return;
  }

  try {
    await transporter.verify();
    console.log(`SMTP READY (${type})`);
  } catch (err) {
    console.error(`❌ SMTP ${type} ERROR:`, err.message);
  }
};

(async () => {
  await verifyTransporter("inscription", transporterInscription);
  await verifyTransporter("noreply", transporterNoReply);
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
      fromType === "inscription" ? transporterInscription : transporterNoReply;

    // Adresse expéditeur
    const { from } = getCredentials(fromType);

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
