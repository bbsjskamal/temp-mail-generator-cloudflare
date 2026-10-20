# Cloudflare migration plan

This repository is the isolated Cloudflare migration copy of `temp-mail-generator.site`. The production repository remains unchanged.

## Findings

The frontend is a React 19/Vite application in `client/`. The existing API is Express-based and integrates with Mail.tm through `server/mailService.ts` and `server/mailRoutes.ts`. The current session design stores the provider password and token in an encrypted, short-lived HttpOnly cookie, then reconstructs the session after a process restart. That means the Worker does not need in-memory session storage or a database for the mailbox lifecycle.

The existing Express server also contains Manus OAuth, tRPC, database, and storage-proxy code. Those features are not part of the public temporary-mail flow and are not mounted by the Cloudflare Worker entrypoint. The Worker entrypoint mounts only the Mail.tm API routes, which keeps the migration small and avoids carrying unsupported application services into the Worker.

Cloudflare's current Workers runtime supports Express with the `nodejs_compat` compatibility flag, but the Worker smoke test showed that this project's Express body-parser dependency is not safe to execute in the local Worker runtime. The final Worker therefore uses the native Fetch API for routing and request parsing while reusing the existing Mail.tm service functions. The static React build remains independently deployable through Cloudflare Pages.

## Changes in this copy

- `worker/index.ts` runs a native Fetch-based Worker API that preserves the existing Mail.tm endpoint contract.
- `wrangler.jsonc` defines the Worker name, compatibility date, Node compatibility, public variables, and observability.
- `client/src/lib/api.ts` supports same-origin local development and a separate production API origin.
- Mailbox-related frontend requests use the API helper, including attachment links.
- `package.json` adds Pages and Wrangler scripts without changing the existing application dependencies.
- Production CORS allows only the configured frontend origins and credentials are enabled for the encrypted mailbox cookie.
- `todo.md` tracks remaining manual deployment and verification work.

## Required Worker configuration

Set the secret; never commit its value:

```bash
pnpm wrangler secret put JWT_SECRET
```

The committed `wrangler.jsonc` variables are:

- `APP_URL=https://temp-mail-generator.site`
- `FRONTEND_ORIGINS=https://temp-mail-generator.site`

For a temporary Pages preview, set `FRONTEND_ORIGINS` to the exact preview origin as an additional comma-separated value. Do not use `*` with credentialed cookies.

## Cloudflare Pages setup

Create a Pages project connected to this repository and configure:

- Production branch: `main`
- Build command: `pnpm install --frozen-lockfile && pnpm run build:pages`
- Build output directory: `dist/public`
- Node.js version: `22` or the current supported LTS version
- `VITE_API_BASE_URL=https://api.temp-mail-generator.site`

Pages serves the existing `client/public` files, including `ads.txt`, verification files, robots, sitemap files, and the favicon.

## Worker setup

From this repository:

```bash
pnpm install --frozen-lockfile
pnpm wrangler secret put JWT_SECRET
pnpm run build:worker
pnpm run deploy:worker
```

The first deployment should use the generated `workers.dev` URL for smoke testing. Do not point the production frontend at it until the health, mailbox creation, cookie, CORS, and message polling checks pass.

## Custom domain and DNS plan

Use the Pages custom-domain UI for `temp-mail-generator.site`. Use a separate Worker custom domain or route for `api.temp-mail-generator.site`. The exact DNS target is supplied by Cloudflare when the domain is attached; do not invent a target record.

Preserve all existing MX, SPF, DKIM, DMARC, and other mail records. The web frontend and API subdomain must not replace or remove mail-delivery records.

After Cloudflare finishes certificates, verify:

```bash
curl -i https://temp-mail-generator.site/
curl -i https://api.temp-mail-generator.site/api/health
curl -i -X OPTIONS https://api.temp-mail-generator.site/api/mailbox/new \
  -H 'Origin: https://temp-mail-generator.site' \
  -H 'Access-Control-Request-Method: POST'
```

## Session and privacy design

Mailbox credentials stay server-side inside the encrypted cookie. The browser receives only the generated address and expiry metadata. Every protected mailbox route requires the matching cookie, and expired sessions cannot be revived. The Worker does not log mailbox contents, passwords, or provider tokens.

No KV, D1, or Durable Object is required for this design. The encrypted cookie is the recovery mechanism. If future requirements need server-side revocation, global abuse counters, or a mailbox deletion registry, add KV or a Durable Object deliberately rather than introducing storage now.

## Cost notes

Cloudflare Pages static asset requests are not the same as Worker invocations. The Workers Free plan currently includes 100,000 Worker requests per day and 10 ms CPU time per invocation. The Workers Paid plan has a $5 monthly minimum, includes 10 million requests per month and 30 million CPU milliseconds, and charges for usage above those allowances. Actual cost depends on API polling frequency, mailbox creation volume, CPU time, and any storage added later. Two hundred thousand visitors does not by itself guarantee a cost below $5.

## Rollback

The original production repository remains the rollback source. If the Cloudflare version fails validation, keep the current deployment unchanged. If it has already been connected to the domain, remove or disable the Cloudflare Pages custom domain and Worker custom domain/route, then restore the prior hosting DNS configuration. Never delete the original repository or its deployment during the migration.

## Official references

- Cloudflare Express on Workers: <https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/>
- Cloudflare storage options and session guidance: <https://developers.cloudflare.com/workers/platform/storage-options/>
- Cloudflare Workers pricing and limits: <https://developers.cloudflare.com/workers/platform/pricing/>
- Cloudflare Worker routes and custom-domain routing: <https://developers.cloudflare.com/workers/configuration/routing/routes/>
- Cloudflare Node.js crypto compatibility: <https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/>
