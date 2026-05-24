# Running the admin app locally

The admin app talks to all three backends. Make sure they are up first, otherwise every page will spin.

## Option 1 — `ng serve` (fastest iteration)

```powershell
npm install --no-audit --no-fund
npm start
```

`npm start` runs `ng serve --host 0.0.0.0` and the dev server listens on `http://localhost:4200`. Hot reload is enabled.

The browser hits the backends at the URLs baked into `src/environments/environment.ts`:

```
graphqlUrl:      http://localhost:8093/graphql
documentsApiUrl: http://localhost:8091/api/v1
aiApiUrl:        http://localhost:8092/api/v1
```

If your backends are on different ports, edit that file (no rebuild needed in dev, Angular CLI watches it).

## Option 2 — Docker (production-style)

```powershell
docker compose up -d --build
# Admin UI: http://localhost:4200
```

The Dockerfile is a two-stage build:

1. `node:20-alpine`: `npm ci` + `npm run build` produces `dist/`.
2. `nginx:alpine`: serves `dist/<app>/browser/` with `nginx.conf`.

Rebuilds are needed when changing `environment.ts` because the values are baked into the JS bundles.

## Option 3 — Full system

From the Go repo's `docker-compose.full.yml`, the admin runs at `ficct-full-admin` on host port **4200**. All three backends are running too, so the URLs in `environment.ts` resolve.

---

## Signing in

The Go seed creates three accounts:

| Email | Password | Role | What this account can do in the UI |
|-------|----------|------|------------------------------------|
| `admin@ficct.local` | `Admin123!` | admin | Everything — products CRUD, branches CRUD, inventory writes, AI analytics, audit log. |
| `staff@ficct.local` | `Staff123!` | staff | Read everything, inventory adjustments (set/adjust/reorder), AI analytics. Cannot create products/branches. |
| `cliente@ficct.local` | `Cliente123!` | customer | Login succeeds but most pages will show empty data — customer routes live on the React Native app, not here. |

---

## Running the Playwright suite

```powershell
# Make sure the full system is up first (Go + Express + Django + Angular + Mobile-web).
npx playwright test --config=e2e/playwright.config.ts
```

Two specs:

- `admin-product-flow.spec.ts` — login as admin, create a product, edit it, verify it appears in the list.
- `customer-rbac.spec.ts` — login as the seeded customer in the *customer* app (RN web at `localhost:4300`), verify they cannot reach the admin URLs.

These are not part of CI. They exist as a manual smoke set.

---

## Running Karma unit tests

```powershell
npm test
```

The config runs Chrome Headless once (no watch mode by default). There is no extensive test suite — only a handful of services have specs. Treat the unit test step as "things compile + interceptors do not throw," not "behaviour is fully verified."

---

## Lint and typecheck

```powershell
npm run lint        # angular-eslint + @typescript-eslint
npm run typecheck   # tsc --noEmit on the whole project
```

Both run quickly. The pre-commit story is left to the developer; there is no `husky` setup.

---

## Troubleshooting

- **CORS errors in the browser console** — confirm `CORS_ALLOWED_ORIGINS` on each backend includes `http://localhost:4200`. The Go and Express defaults already do. Django's default does too, but if you've changed `.env`, double-check.
- **Login returns 401 from Go** — the seed runs every time the Go container starts; if you've wiped the Postgres volume and not yet re-seeded, login will fail. Either restart `go-core` (its command includes `migrate up && seed`) or run `make seed` from the Go repo.
- **Charts blank** — `monthlySales` may have returned an empty array. Confirm there are confirmed sales in the database (seed creates none — you need to manually `createSale` + `confirmSale`).
- **`PUT` to MinIO 403s** — the presigned URL was generated with `S3_PUBLIC_ENDPOINT` pointing at a different host than what the browser is on. In the full-system compose, this is set to `http://localhost:9010`. If you've changed it, regenerate the URL.
