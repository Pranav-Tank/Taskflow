# Deployment notes

Taskflow is currently verified locally. No public host or live-demo URL is configured.

## Same-origin production hosting

Express can serve both the built React application and the API. Use a host that supports a persistent Node.js process and a PostgreSQL database.

1. Install Node.js 24.11+ and project dependencies. Keep Prisma CLI available when running migration commands; it is a development dependency in this repository.
2. Configure backend/.env (or equivalent server environment variables): DATABASE_URL, JWT_SECRET, PORT, NODE_ENV=production and CLIENT_ORIGIN=https://your-domain.
3. From the repository root, run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run build
npm start
```

The root start command launches the backend workspace. Its production server serves frontend/dist and /api on one origin. Terminate HTTPS at the host or reverse proxy: production authentication cookies use Secure.

## Demo data

Run db:seed only on a dedicated demonstration database. It creates public demo accounts with the documented shared password; prepare the credentials and role permissions deliberately before making an instance public.

## Operational decisions

- Manage database backups and migration rollout with the hosting provider; do not reset a database during deployment.
- Keep JWT secrets and connection credentials outside source control. Use the provider's PostgreSQL TLS configuration; do not disable certificate validation to bypass connection errors.
- Rate limits currently use process-local memory. A multi-instance deployment needs a shared store. Configure Express proxy trust appropriately for the specific host before relying on forwarded client IPs.
- Use a process supervisor and health checks at /api/health. The server handles shutdown; define a host-level shutdown timeout.
- Test sign-in, cookies, role scopes and refresh navigation through the actual HTTPS domain after deployment.

Deployment is a separate step from a successful local build. Add a public-demo link to the README only once the hosted instance has been checked.
