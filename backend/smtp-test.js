const { transporter, defaultFrom } = require("./config/smtp");

async function main() {
  if (!transporter) {
    console.error("❌ Impossible de tester SMTP : configuration manquante");
    return;
  }

  try {
    console.log("⏳ Connexion SMTP…");
    await transporter.verify();
    console.log("✔ Connexion SMTP OK");

    const info = await transporter.sendMail({
      from: process.env.SMTP_TEST_FROM || defaultFrom,
      to: process.env.SMTP_TEST_TO || "test@example.com",
      subject: "TEST SMTP - KZIIK",
      text: "Si tu reçois ce mail, SMTP fonctionne !",
    });

    console.log("📤 Mail envoyé:", info.messageId);
  } catch (err) {
    console.error("❌ ERREUR SMTP:", err?.message || err);
  }
}

main();
