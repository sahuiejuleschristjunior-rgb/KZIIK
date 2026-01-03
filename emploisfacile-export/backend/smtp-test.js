const nodemailer = require("nodemailer");

async function main() {
  const transporter = nodemailer.createTransport({
    host: "mail.emploisfacile.org",
    port: 465,
    secure: true,
    auth: {
      user: "no-reply@emploisfacile.org",
      pass: "@SUCCESS7a"
    }
  });

  try {
    console.log("‚è≥ Connexion SMTP‚Ä¶");
    await transporter.verify();
    console.log("‚úî Connexion SMTP OK");

    let info = await transporter.sendMail({
      from: "no-reply@emploisfacile.org",
      to: "sahuieJuleschristjunior@gmail.com",
      subject: "TEST SMTP - EMPLOISFACILE",
      text: "Si tu re√ßois ce mail, SMTP fonctionne !"
    });

    console.log("Ì†ΩÌ≥® Mail envoy√©:", info.messageId);
  } catch (err) {
    console.error("‚ùå ERREUR SMTP:", err);
  }
}

main();
