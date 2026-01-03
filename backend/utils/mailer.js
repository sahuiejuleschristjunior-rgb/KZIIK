const fs = require("fs");
const path = require("path");
const { transporter, defaultFrom } = require("../config/smtp");

/* ============================================================
   ENVOI D’UN EMAIL HTML AVEC TEMPLATE
============================================================ */

exports.sendTemplateEmail = async (
  templateName,
  to,
  subject,
  variables = {},
  from = defaultFrom
) => {
  try {
    if (!transporter || !from) {
      console.warn(
        `⚠️ SMTP non configuré : email '${subject}' vers ${to} ignoré.`
      );
      return { success: false, skipped: true };
    }

    console.log("SMTP_LOG", { to, subject });

    const templatePath = path.join(__dirname, "../templates", templateName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template introuvable : ${templateName}`);
    }

    let html = fs.readFileSync(templatePath, "utf8");

    for (const key in variables) {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
    }

    console.log("EMAIL SEND ATTEMPT", {
      to,
      subject,
      from,
      template: templateName,
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
    return { success: false, error: err.message || String(err) };
  }
};
