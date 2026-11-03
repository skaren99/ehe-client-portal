# ehe-client-portal

Assigned couple workspace: tasks, comments, contacts and activity.

Independent React + TypeScript + Vite application. This is a migration baseline; preserved legacy code and mock-ups are in the sibling `ehe-design-archive` repository. The complete feature inventory and remaining work are in `ehe-platform/MIGRATION.md`. Do not treat this baseline as a completed production replacement.

## Develop

Node 24 or newer with npm:

```sh
npm ci
npm test
npm run build
npm run dev
```

Open http://localhost:5175. Vite binds locally and proxies API requests to the two services. Start the integrated local stack from `ehe-platform` first; stop this app's container before using the same port for Vite. `.env.example` lists optional public configuration. Copy it to `.env` when overriding defaults. No frontend environment value should contain a secret.

The app is independently deployable as static assets in `dist/`, or via the included multi-stage Dockerfile. Configure an SPA fallback for application routes. The included nginx config forwards APIs to `site-service:8081` and `wedding-service:8082`; change the proxy targets for independent hosting. Docker builds accept `VITE_*` build arguments for identity/redirect URLs and the client-portal link.

Sign-in uses OIDC authorization code + PKCE. The identity server and API enforce roles and record ownership; frontend separation is not a security boundary.

No API mocks or localStorage wedding database are substituted when the server is unavailable. UI errors remain visible. `npm run build` type-checks and compiles; GitHub Actions runs tests and the build for each push/PR. Package versions are locked in `package-lock.json`.

See the platform repository for architecture, API contracts, generated local development accounts and GitHub push instructions. Initial commit author: `skaren99 <karensaksakulm@gmail.com>`.
