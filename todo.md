# Cloudflare migration checklist

## Completed in the secondary repository

- [x] Preserve the production source at commit `b5039c6`.
- [x] Add a Cloudflare Worker entrypoint using the existing Express Mail.tm routes.
- [x] Enable `nodejs_compat` and configure Wrangler.
- [x] Keep mailbox credentials in the encrypted HttpOnly cookie.
- [x] Add credentialed CORS for the separate frontend origin.
- [x] Add a configurable frontend API base URL.
- [x] Update mailbox, inbox, message, contact, IndexNow, and attachment requests for the API base.
- [x] Add Pages and Worker build/deploy scripts.
- [x] Document variables, DNS safety, cost assumptions, testing, and rollback.

## Remaining manual actions

- [ ] Connect this repository to Cloudflare Pages.
- [ ] Set Pages build command to `pnpm install --frozen-lockfile && pnpm run build:pages`.
- [ ] Set Pages output directory to `dist/public`.
- [ ] Set `VITE_API_BASE_URL` to the deployed API hostname.
- [ ] Authenticate Wrangler with the Cloudflare account that owns the domain.
- [ ] Set the Worker secret with `pnpm wrangler secret put JWT_SECRET`.
- [ ] Deploy the Worker and record its URL.
- [ ] Attach `api.temp-mail-generator.site` to the Worker through Cloudflare.
- [ ] Attach `temp-mail-generator.site` to Pages through Cloudflare.
- [ ] Preserve and verify MX, SPF, DKIM, and DMARC records.
- [ ] Run the health, CORS, mailbox creation, cookie, inbox polling, expiry, and attachment checks.
- [ ] Keep the existing production deployment active until all checks pass.
