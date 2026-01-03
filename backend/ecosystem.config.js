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
        MONGO_URI: "mongodb://127.0.0.1:27017/kziik",
        JWT_SECRET: "change_me",
        PORT: 3000,
      },
    },
  ],
};
