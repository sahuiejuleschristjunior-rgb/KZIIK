const nodemailer = require("nodemailer");

async function main() {
  const transporter = nodemailer.createTransport({
    host: "mail.kziik.com",
    port: 465,
    secure: true,
    auth: {
      user: "no-reply@kziik.com",
      pass: "@SUCCESS7a"
    }
  });

  try {
    console.log("⏳ Connexion SMTP…");
    await transporter.verify();
    console.log("✔ Connexion SMTP OK");

    let info = await transporter.sendMail({
      from: "no-reply@kziik.com",
      to: "sahuieJuleschristjunior@gmail.com",
      subject: "TEST SMTP - KZIIK",
      text: "Si tu reçois ce mail, SMTP fonctionne !"
    });

    console.log(" Mail envoyé:", info.messageId);
  } catch (err) {
    console.error("❌ ERREUR SMTP:", err);
  }
}

main();
