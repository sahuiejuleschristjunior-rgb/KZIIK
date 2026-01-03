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
      },
    },
  ],
};
