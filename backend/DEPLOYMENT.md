# Déploiement backend + infra KZIIK

Ce guide rassemble les commandes nécessaires pour faire fonctionner le backend, PM2 et Nginx en production. Les exemples supposent que le backend écoute sur `3000` et que le frontend est servi sur `https://kziik.com`.

## Variables d'environnement indispensables

Ces variables doivent être définies avant de démarrer le backend (via `.env`, export shell ou PM2) :

- `MONGO_URI` : URL complète MongoDB (obligatoire)
- `JWT_SECRET` : secret JWT pour la signature des tokens
- `PORT` : port HTTP du backend (par défaut `3000`)

Le fichier [`config/loadEnv.js`](config/loadEnv.js) charge automatiquement un `.env` à la racine du projet **puis** `backend/.env` si présents. Les valeurs déjà définies dans l'environnement ne sont jamais écrasées.

Vous pouvez préparer un `.env` minimal pour le backend en copiant l'exemple fourni :

```bash
cp backend/.env.example backend/.env
# Éditez MONGO_URI / JWT_SECRET si besoin
```

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

Pour un déploiement très rapide où seuls le port, Mongo et le secret JWT sont nécessaires, vous pouvez également écrire directement le `.env` du backend puis demander à PM2 de recharger l'environnement :

```bash
printf "NODE_ENV=production\nPORT=3000\nMONGO_URI=mongodb://127.0.0.1:27017/kziik\nJWT_SECRET=change-moi\n" > /var/www/kziik/backend/.env
pm2 restart kziik-backend --update-env
```

Si vous utilisez le SMTP Hostinger, vous pouvez préparer un `.env` complet directement dans `/var/www/kziik/backend/.env` avant de redémarrer PM2 :

```bash
cat > /var/www/kziik/backend/.env <<'EOF'
NODE_ENV=production
PORT=3000

# MongoDB (à adapter si besoin)
MONGO_URI=mongodb://127.0.0.1:27017/kziik

# SMTP Hostinger
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true

SMTP_INSCRIPTION_EMAIL=inscription@kziik.com
SMTP_INSCRIPTION_PASSWORD=@SUCCESS7a

SMTP_NOREPLY_EMAIL=no-reply@kziik.com
SMTP_NOREPLY_PASSWORD=@SUCCESS7a
EOF
pm2 restart kziik-backend --update-env
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

## Installation MongoDB sur Ubuntu 24.04 (production)

MongoDB n'est pas inclus par défaut dans l'image Ubuntu Noble. Les commandes suivantes ajoutent le dépôt officiel 7.0, installent le serveur et lancent le service.

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

# Démarrage + activation système (si systemd est disponible)
sudo systemctl enable --now mongod

# Alternative en environnement sans systemd (container) :
sudo mongod --config /etc/mongod.conf --fork --logpath /var/log/mongodb/mongod.log

# Vérifier la connexion
mongosh --eval "db.runCommand({ ping: 1 })"
```

Si vous êtes derrière un proxy HTTPS, vérifiez que les variables `http_proxy`/`https_proxy` sont bien définies et que le proxy autorise l'accès à `archive.ubuntu.com` et `repo.mongodb.org`; sinon `apt-get update` peut retourner un `403 Forbidden`.
