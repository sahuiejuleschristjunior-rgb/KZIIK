const fs = require("fs");
const path = require("path");
const {
  inscriptionTransporter,
  noreplyTransporter,
  getFromAddress,
} = require("../config/smtp");

/* ============================================================
   ENVOI D’UN EMAIL HTML AVEC TEMPLATE
============================================================ */

exports.sendTemplateEmail = async (
  templateName,
  to,
  subject,
  variables = {},
  fromType = "noreply" // "inscription" OU "noreply"
) => {
  try {
    const transporter =
      fromType === "inscription" ? inscriptionTransporter : noreplyTransporter;
    const from = getFromAddress(fromType);

    if (!transporter || !from) {
      console.warn(
        `⚠️ SMTP (${fromType}) non configuré : email '${subject}' vers ${to} ignoré.`
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
    return { success: false, error: err.message || String(err) };
  }
};
