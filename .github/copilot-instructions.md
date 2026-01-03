<!--
  Short, actionable instructions for AI coding agents working on the EmploisFacile repo.
  Keep this file concise (20-50 lines). Update when architecture or important envs change.
-->
# Copilot instructions — EmploisFacile

- Project structure (big picture):
  - `backend/` — Express + Mongoose API, Socket.IO server and mail templates.
    - Entry: `backend/server.js` (loads routes, static `/uploads`, initializes sockets)
    - DB config: `backend/config/db.js` (expects `MONGO_URI` env)
    - Socket helpers: `backend/socket.js` (use `initSocket(server)` and `getIO()`)
    - Templates: `backend/templates/` — HTML email templates used by `backend/utils/mailer.js`.
  - `frontend/` — React + Vite (optionally Capacitor mobile wrappers). Uses `socket.io-client`.

- How to run locally (dev):
  1. Backend: `cd backend && npm install` then create a `.env` with required vars (see Env section) and run `npm start` (server uses `node server.js`).
  2. Frontend: `cd frontend && npm install && npm run dev` (Vite dev server).

- Critical env variables (must be set in backend/.env):
  - `MONGO_URI` — MongoDB connection string
  - `JWT_SECRET` — JWT signing secret
  - `FRONTEND_URL` — allowed origin for Socket.IO
  - SMTP (used by `backend/utils/mailer.js`): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER_INSCRIPTION`, `SMTP_PASS_INSCRIPTION`, `SMTP_USER_NO_REPLY`, `SMTP_PASS_NO_REPLY`, `FROM_EMAIL_INSCRIPTION`, `FROM_EMAIL_NO_REPLY`

- API & auth conventions:
  - All API routes are mounted under `/api/*` (see `server.js`). Examples: `/api/auth`, `/api/jobs`, `/api/messages`.
  - Auth middleware: `backend/middlewares/authMiddleware.js` expects header `Authorization: Bearer <token>` and sets `req.user` with `id` and `role`.
  - Controllers follow try/catch and typically return JSON `{ success: true, ... }` on success or `{ error: "..." }` on errors (often 400/500 status codes).

- Socket.IO patterns:
  - Socket path: `/socket.io/` (explicit in `backend/socket.js`), transports `['polling','websocket']`.
  - Client must send token in handshake with `auth: { token }`; server verifies JWT and assigns `socket.userId`.
  - Real-time events (examples): `send_message`, `new_message`, `typing`, `messages_read`, `friend_request`, `post_like`, `call_offer`.

- Data patterns and Mongo usage:
  - Mongoose models often embed refs and use `.populate()` (e.g., `Job` has `applications` array of ObjectIds and `recruiter` ref to `User`).
  - When creating related documents, controllers push ids into parent docs (see `JobController.applyToJob` which `$push`es application id to `Job.applications`).

- File uploads & static files:
  - Static served from `/uploads` (see `express.static` in `server.js`). Upload endpoint: `backend/routes/upload.js` (uses multer middleware in `backend/middlewares/upload.js`).

- Debugging tips & logs to look for:
  - DB connection: console logs on successful connect or error in `server.js`.
  - SMTP verification output is printed at startup from `mailer.js` (useful to spot credential issues).
  - Socket connect logs: `🔌 Socket connecté :` printed from `socket.js` on connect.

- Quick editing rules for agents:
  - Respect existing JSON response shapes (do not change `success`/`error` keys unless updating all callers).
  - Use and maintain `req.user.id` compatibility — many controllers rely on it.
  - Avoid changing socket `path` or transports unless updating front-end client and nginx config accordingly.

If anything important is missing or you want examples added (e.g. exact `.env` template), tell me and I will update this file.
