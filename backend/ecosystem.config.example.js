module.exports = {
  apps: [
    {
      name: "kziik-backend",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork", // garder un port unique pour le reverse proxy
      watch: false,
      env: {
        // ⚠️ remplissez ces variables avant de lancer PM2
        MONGO_URI: "mongodb+srv://USER:PASSWORD@HOST/DATABASE?retryWrites=true&w=majority",
        JWT_SECRET: "change_me",
        PORT: 3000,
        SMTP_HOST: "smtp.hostinger.com",
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: "no-reply@kziik.com",
        SMTP_PASS: "@SUCCESS7a",
        SMTP_USER_NO_REPLY: "no-reply@kziik.com",
        SMTP_PASS_NO_REPLY: "@SUCCESS7a",
        SMTP_USER_INSCRIPTION: "inscription@kziik.com",
        SMTP_PASS_INSCRIPTION: "@SUCCESS7a",
        FROM_EMAIL_NO_REPLY: "no-reply@kziik.com",
        FROM_EMAIL_INSCRIPTION: "inscription@kziik.com",
      },
    },
  ],
};
