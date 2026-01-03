# Déploiement backend + infra KZIIK

Ce guide rassemble les commandes nécessaires pour faire fonctionner le backend, PM2 et Nginx en production. Les exemples supposent que le backend écoute sur `3000` et que le frontend est servi sur `https://kziik.com`.

## Variables d'environnement indispensables

Ces variables doivent être définies avant de démarrer le backend (via `.env`, export shell ou PM2) :

- `MONGO_URI` : URL complète MongoDB (obligatoire)
- `JWT_SECRET` : secret JWT pour la signature des tokens
- `PORT` : port HTTP du backend (par défaut `3000`)

Le fichier [`config/loadEnv.js`](config/loadEnv.js) charge automatiquement un `.env` à la racine du projet **puis** `backend/.env` si présents. Les valeurs déjà définies dans l'environnement ne sont jamais écrasées.

## Exemple de configuration PM2

Un exemple prêt à remplir est fourni dans [`ecosystem.config.example.js`](ecosystem.config.example.js). Copiez-le puis éditez les valeurs :

```bash
cp ecosystem.config.example.js ecosystem.config.js
# Éditez MONGO_URI / JWT_SECRET / PORT
```

Lancement ou redémarrage du backend avec PM2 (charge les variables définies dans le fichier) :

```bash
pm2 start ecosystem.config.js --env production
# ou pour prendre en compte des modifications d'env
pm2 restart ecosystem.config.js --update-env
```

Vérification des logs (la connexion Mongo doit afficher `✔ Database connected`) :

```bash
pm2 logs kziik-backend
```

Si `MONGO_URI` est manquant, le process quittera immédiatement avec un message explicite.

## Nginx (proxy vers le backend)

Exemple de bloc serveur pour `kziik.com` :

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name kziik.com www.kziik.com;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # le reste des fichiers statiques/front peut rester inchangé
}
```

Après mise à jour de la configuration, relancer Nginx :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Vérifications rapides

- Santé API : `curl -i http://127.0.0.1:3000/api/health`
- Inscription : `curl -i -X POST http://127.0.0.1:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"secret"}'`

En production derrière Nginx, les mêmes requêtes doivent répondre sans `502`.
