# Angular Admin — Deployment

## Production API URLs (`src/environments/environment.prod.ts`)

- GraphQL (Go core, Railway): `https://ficct-boutique-backend-go-production.up.railway.app/graphql`
- Documents (MS3, AWS API Gateway): `https://docs-api-boutique.ficct.com/api/v1`
- AI (MS2, GCP Cloud Run): `https://ficct-ai-1093089304525.us-central1.run.app/api/v1`

> MS2 is currently **private** (GCP Domain-Restricted-Sharing blocks public
> `allUsers`); browser calls to the AI API need the org-policy exception (or an
> authenticated gateway). MS3 CORS must include the admin origin.

## Build

```powershell
npm ci
npm run lint        # passes
npm run build       # -> dist/ficct-admin  (verified)
```

`npm run typecheck` currently reports errors only in `e2e/*.spec.ts` (missing
`@playwright/test` types); application code type-checks and builds cleanly.

## Hosting (low-cost)

Recommended: **Cloudflare Pages** (free tier).

```powershell
npx wrangler pages deploy dist/ficct-admin --project-name ficct-admin
```

Then add a Cloudflare CNAME `admin-boutique.ficct.com` → the Pages project.
Status: build artifact verified; a hosting target is not yet provisioned, so the
`admin-boutique.ficct.com` DNS record is intentionally **not** created (no broken
origin).
