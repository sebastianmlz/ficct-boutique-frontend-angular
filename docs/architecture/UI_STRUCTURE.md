# UI Structure

This document maps every visible screen in the admin app to its components and to the backend endpoints it calls.

## Routes

Defined in [src/app/app.routes.ts](../../src/app/app.routes.ts).

| Path | Component | Roles allowed | Backends called |
|------|-----------|----------------|------------------|
| `/login` | `LoginComponent` | (public) | Go `mutation login` |
| `/dashboard` | `DashboardComponent` | any auth | Go `dashboardSummary`, `monthlySales`, `popularProducts` |
| `/products` | `ProductsListComponent` | any auth | Go `products` (read), `deactivateProduct` / `activateProduct` for admin |
| `/products/new`, `/products/:id/edit` | `ProductFormComponent` | admin only | Go `createProduct` or `updateProduct` (+ `replaceProductImage` after a successful upload); Express upload flow for the image |
| `/inventory` | `InventoryComponent` | any auth | Go `inventoryEntries`, `branches`; `setInventoryStock` / `adjustInventoryStock` / `updateInventoryReorderLevel` for admin/staff |
| `/branches` | `BranchesComponent` | any auth | Go `branches`, `createBranch` (admin) |
| `/sales` | `SalesComponent` | any auth | Go `sales`, `monthlySales`, `popularProducts` |
| `/documents` | `DocumentsComponent` | any auth | Express full set (upload-request, PUT, confirm, list, download-url, verify, delete, restore, ledger) |
| `/audit` | `AuditComponent` | admin only | Express `GET /api/v1/audit` |
| `/ai-analytics` | `AiAnalyticsComponent` | admin or staff | Django: `POST /forecasting/run`, `GET /forecasting/latest/{scope}`, `POST /clustering/run`, `GET /clustering/segments` |

The role guard runs **after** the auth guard — if the user isn't signed in, they go to `/login` first; if they are signed in but lack the role, they get bounced to `/dashboard`.

---

## Shell

`MainLayoutComponent` renders the sidebar + header that surround every authenticated screen. It is loaded lazily on the parent route so the login page does not pull in the chart library or sidebar templates.

The sidebar's nav items are filtered by `AuthService.hasRole(...)` so admin-only links don't appear for staff/customer logins. This is purely cosmetic — the routes themselves still have their own guards, and the backends still enforce permissions independently.

---

## Component conventions

Every feature is split:

```
features/<name>/
  <name>.component.ts     class with signals, effects, view-model
  <name>.component.html   template using Tailwind classes
```

There are **no** inline templates. The convention exists so that pull-request reviewers can read either file independently — the TypeScript without scanning template syntax, the HTML without scrolling past class definitions.

Where a feature has multiple pages (e.g. products list + form), each page is its own component pair.

---

## Apollo wiring

`provideApollo()` in [src/app/core/graphql/apollo.config.ts](../../src/app/core/graphql/apollo.config.ts) does:

1. `createHttpLink({ uri: environment.graphqlUrl })` — plain HTTP, no batching, no subscriptions.
2. `setContext` to attach `Authorization: Bearer <token>` from `AuthService.tokenSignal()`.
3. `InMemoryCache` with type policies that disable caching for the queries marked `network-only` in the feature components.

The reason for `network-only` on most one-shot reads: when a user signs out and a different user signs in, we don't want the previous user's cached data to flash on screen before the new fetch resolves.

---

## HTTP wiring

`provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`:

- `authInterceptor` looks at the request URL — if it starts with `environment.documentsApiUrl` or `environment.aiApiUrl`, it appends the bearer.
- `errorInterceptor` catches `401` from any HTTP call (REST or Apollo's HTTP link), invalidates the session, and routes to `/login`.

`fetch` calls (the direct PUT to S3/MinIO for the upload step) bypass both interceptors by design — the presigned URL already contains its own auth and adding a `Bearer` would break the signature.

---

## Document upload screen — the only browser-side crypto

```typescript
// features/documents/documents.component.ts (paraphrased)
const buf = await file.arrayBuffer();
const hash = await crypto.subtle.digest('SHA-256', buf);
const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
```

The hash is sent to Express in the confirm call. Express re-hashes the object server-side and refuses if the two disagree.

---

## Charts

All chart configuration is centralized in [src/app/shared/charts/chart-defaults.ts](../../src/app/shared/charts/chart-defaults.ts):

- `bobCurrency(value)` — locale-aware BOB formatter (`Intl.NumberFormat('es-BO')`).
- `spanishMonthShort(iso)`, `spanishMonthLong(iso)` — month labels via `Intl.DateTimeFormat`.
- `monthlyBarOptions()` — `ChartOptions<'bar'>` with BOB-currency tooltips, no grid on X-axis, mute-coloured ticks.

The dashboard's monthly sales chart and the AI analytics forecast chart both use these so all bars look the same.

---

## Where the design tokens live

There is no separate design system package. Tailwind's config (`tailwind.config.js`) is the source of truth for colours/spacing. The chart palette in `chart-defaults.ts` mirrors a subset of those colours by hex. If you change the brand palette, update both.
