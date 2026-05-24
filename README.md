# FICCT Boutique — Admin Frontend (Angular)

Administrative web console for the FICCT Boutique distributed system. Consumes the Go core GraphQL API for catalog/sales/branches/reports, the Express REST API for documents/audit, and the Django AI service for forecasting/clustering/similarity.

## What is real in this repo

What this app actually does today:

- Loads the Go core's GraphQL schema via Apollo Angular over HTTP only (no WebSocket subscriptions — the backend doesn't expose them).
- Calls the Express documents API for the upload/download/verify/audit flows.
- Calls the Django AI API for `POST /forecasting/run`, `POST /clustering/run`, and the corresponding read endpoints.
- Stores the bearer token in `localStorage`. There is no refresh-token rotation; on `exp` the user must sign in again.
- Renders charts with `chart.js` + `ng2-charts`. The pure-Tailwind bar charts mentioned in earlier drafts no longer exist — they were replaced.
- Has a Playwright suite in `e2e/` with two specs: `admin-product-flow.spec.ts` and `customer-rbac.spec.ts`. They are not wired into CI; run them locally with `npx playwright test` against a running app.

What this app does **not** do:

- It does not have native camera capture. The "buscar por foto" surface lives in the React Native app; this admin UI only consumes the AI endpoints with explicit file inputs.
- It does not implement a service worker / PWA / offline mode.
- It does not have multi-locale support. Every string is in Spanish (Bolivia).
- It does not refresh tokens silently; expiry forces a re-login.

---

## Tech stack

| Concern | Choice |
|---------|--------|
| Framework | Angular 17 (standalone components, signals where it helps, OnPush change detection where used) |
| Routing | Lazy-loaded routes with `authGuard` + `roleGuard` |
| GraphQL | Apollo Angular + `@apollo/client` |
| HTTP / REST | Angular `HttpClient` with `authInterceptor` + `errorInterceptor` |
| Styling | TailwindCSS 3 + PostCSS, separate `.html` template per component |
| Charts | `chart.js` 4 via `ng2-charts` 5 |
| Build | Angular CLI 17 |
| Test | Karma + Jasmine (unit); Playwright (e2e, demo set only) |
| Container | nginx 1.x serving the static prod build |

---

## Directory layout

```
src/
  main.ts
  index.html              loads Inter + DM Serif Display fonts
  styles.css              Tailwind layers + small components layer
  environments/
    environment.ts        defaults to localhost ports (8093/8091/8092)
                          (a single env file — no environment.development.ts)
  app/
    app.config.ts         providers: router, animations, HttpClient + interceptors, Apollo
    app.routes.ts         all routes, lazy-loaded, guards
    app.component.ts      <router-outlet />
    core/
      auth/               AuthService (signals), authGuard, roleGuard
      graphql/            provideApollo() — http link + auth context
      interceptors/       authInterceptor, errorInterceptor (401 -> /login)
      layout/main-layout/ sidebar shell + role-aware nav
    features/
      auth/login/         login form, calls Go `mutation login`
      dashboard/          summary cards + monthly sales bar chart + popular products list
      products/           list + form (admin only)
      inventory/          per-branch table + filters + adjust dialog
      branches/           cards grid + create form (admin only)
      sales/              monthly + popular reports
      documents/          presigned upload flow + browser SHA-256 + verify + download
      audit/              audit log viewer (admin only)
      ai-analytics/       forecast bar chart + cluster table (admin/staff)
    shared/
      charts/             Chart.js defaults: palette, BOB currency formatter, locale month labels
      components/         small reusable UI bits
      models/             TypeScript interfaces shared across features
      pipes/, directives/, services/
e2e/
  playwright.config.ts    baseURL http://localhost:4200, 1440x900, headless
  admin-product-flow.spec.ts
  customer-rbac.spec.ts
nginx.conf                serves the prod build with hardening headers
```

Every feature component is **two files**: `<name>.component.ts` for the class and `<name>.component.html` for the template. There are no inline templates.

---

## Running it

### Without Docker (developer machine)

```powershell
npm install --no-audit --no-fund
npm start                  # ng serve on http://localhost:4200
```

The dev server proxies nothing — the browser hits `http://localhost:8093/graphql` etc. directly. Make sure the backends are running first (see the meta-compose in the Go repo) or `ng serve` will load but every page that fetches data will spin.

### With Docker (production-style build behind nginx)

```powershell
docker compose up -d --build
# Admin UI: http://localhost:4200
```

This runs `ng build --configuration production`, then copies `dist/` into an `nginx:alpine` image with `nginx.conf` setting `try_files $uri $uri/ /index.html` so client-side routing works on hard reload.

### As part of the full system

In `docker-compose.full.yml` (Go repo), this container is `ficct-full-admin` on host port **4200**. The browser still hits the backends directly on their host ports (8093/8091/8092). CORS is configured on each backend to allow `http://localhost:4200`.

---

## Backend endpoints used

| Source URL | Set in env |
|------------|------------|
| `http://localhost:8093/graphql` | `environment.graphqlUrl` |
| `http://localhost:8091/api/v1` | `environment.documentsApiUrl` |
| `http://localhost:8092/api/v1` | `environment.aiApiUrl` |

These are baked at build time. To target a different stack, edit `src/environments/environment.ts` (or its prod replacement) and rebuild.

---

## Routes and guards

| Path | Guard | Notes |
|------|-------|-------|
| `/login` | (public) | Falls through to login if no token |
| `/dashboard` | `authGuard` | Any role |
| `/products` | `authGuard` | Any role |
| `/products/new`, `/products/:id/edit` | `authGuard` + `roleGuard(['admin'])` | |
| `/inventory` | `authGuard` | All authenticated users can read; the GraphQL backend gates writes |
| `/branches` | `authGuard` | Read for everyone; create form gated by backend |
| `/sales` | `authGuard` | Backend gates list to admin/staff |
| `/documents` | `authGuard` | Backend gates writes |
| `/audit` | `authGuard` + `roleGuard(['admin'])` | |
| `/ai-analytics` | `authGuard` + `roleGuard(['admin', 'staff'])` | |
| `**` | — | Redirects to `/` |

Frontend guards are a UX courtesy, not a security boundary. The backends enforce roles on every protected operation; without that, a malicious user could call the GraphQL mutation directly.

---

## Apollo + interceptor flow

`provideApollo()` builds an HTTP link to `environment.graphqlUrl`. `setContext` attaches `Authorization: Bearer <token>` from `AuthService.tokenSignal()` on every operation.

For REST, `authInterceptor` does the same on requests whose URL starts with `documentsApiUrl` or `aiApiUrl`. `errorInterceptor` watches for `401` responses and calls `AuthService.clear()` + `Router.navigate(['/login'])`.

Apollo default options use `fetchPolicy: 'network-only'` on one-shot queries so a stale cache from a previous session doesn't leak data after re-login.

---

## Document upload flow (browser-driven)

```
1. POST documents/upload-request    →  { document, upload: { url, method:'PUT', headers, expiresIn } }
2. PUT  <upload.url>  with the File  (browser fetch)
3. crypto.subtle.digest('SHA-256', fileBytes)  →  hex string
4. POST documents/:id/confirm  { sha256: '<hex>' }
5. Document row becomes status='active', hash ledger gains a new chain entry
```

The bytes never traverse this app's server-rendered surface. Even the SHA-256 happens in the browser.

---

## Charts

`src/app/shared/charts/chart-defaults.ts` defines:

- The colour palette (boutique ink, accent, neutral mutes, line colour).
- A `monthlyBarOptions()` factory that returns `ChartOptions<'bar'>` with BOB-currency tooltips, Spanish month labels (`es-BO`), and no top legend.
- Helpers `bobCurrency(value)`, `spanishMonthShort(iso)`, `spanishMonthLong(iso)`.

All charts in the dashboard and AI analytics screens reuse these so the visuals stay consistent.

---

## Auth model (client side)

- `AuthService` exposes `tokenSignal()`, `userSignal()`, `isAuthenticated()`, `hasRole(roles)`, plus `login()` and `clear()`.
- Token + minimal user (`id`, `email`, `role`) are persisted in `localStorage` under a single key. On boot, the service rehydrates the signal from storage.
- The token is **not** decoded for security claims — the backends are the source of truth. The role from `localStorage` is only used to render/hide UI; the backend re-checks on every call.

---

## Security notes

- nginx serves with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-XSS-Protection: 0`.
- Tokens live in `localStorage`. This is fine for an academic delivery but exposes them to XSS — for a real production app, use httpOnly cookies with a session ID and let the backend handle the bearer.
- Every `.html` template is externalized to make code review of the rendered output straightforward.
- CSP is not configured. Adding it requires also configuring nginx and possibly relaxing Tailwind's inline styles.

---

## Known limitations

- No token refresh. The `JWT_REFRESH_TTL_DAYS` in the Go config is observed only by the database schema, not by this client.
- E2E specs are illustrative, not exhaustive. They are not run in CI.
- Single locale: `es-BO`. Adding more would require `@angular/localize` and per-locale prod builds.
- No PWA / service worker / offline.
- No automated visual regression. Screenshots taken during QA live in the Go repo's `docs/qa-artifacts/`.

---

## Documentation index

- [docs/architecture/UI_STRUCTURE.md](docs/architecture/UI_STRUCTURE.md) — page-by-page map of components + which backend each page calls.
- [docs/development/RUNNING_LOCALLY.md](docs/development/RUNNING_LOCALLY.md) — bring-up + test instructions.
- [docs/development/ENVIRONMENT.md](docs/development/ENVIRONMENT.md) — how the build-time environment file works.
