# Deploy from GitHub to Google Cloud Run

This repository is a Node.js/Express application with a Vite frontend. The included `Dockerfile` builds the frontend and server, then starts the production server on Cloud Run's `PORT` value.

## Before deployment

Create or select a Google Cloud project, enable billing, and enable these APIs:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Do not commit `.env` files, API keys, `JWT_SECRET`, or service-account JSON files. Store secrets in Google Secret Manager or Cloud Run's environment-variable settings.

## Option A: Cloud Run console with GitHub integration

1. Push this repository to GitHub. Keep it private if the source should not be public.
2. Open **Google Cloud Console → Cloud Run → Create service**.
3. Select **Continuously deploy from a repository**.
4. Choose **Set up with Cloud Build** and connect GitHub.
5. Select this repository and the `main` branch.
6. Choose the Dockerfile build type. The repository root contains `Dockerfile`.
7. Configure the service:

   | Setting | Value |
   |---|---|
   | Service name | `temp-mail-generator` |
   | Region | `europe-west1` or another region you prefer |
   | Authentication | Allow unauthenticated invocations |
   | Container port | `8080` |
   | Memory | `512 MiB` |
   | CPU | `1` |
   | Minimum instances | `0` |
   | Maximum instances | `3` |
   | Request timeout | `180 seconds` |

8. Add non-secret variables:

   ```text
   NODE_ENV=production
   APP_URL=https://temp-mail-generator.site
   ```

9. Add `JWT_SECRET` from Secret Manager. Do not paste a production secret into GitHub or commit it to the repository.
10. Create the service. Later pushes to `main` will trigger a Cloud Build and deploy a new Cloud Run revision.

## Option B: Deploy from Cloud Shell

From a checkout of this repository:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud run deploy temp-mail-generator \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min 0 \
  --max 3 \
  --timeout 180 \
  --set-env-vars NODE_ENV=production,APP_URL=https://temp-mail-generator.site
```

For production, provide `JWT_SECRET` through Secret Manager rather than `--set-env-vars`:

```bash
gcloud run services update temp-mail-generator \
  --region europe-west1 \
  --update-secrets JWT_SECRET=temp-mail-jwt-secret:latest
```

Check the deployed URL and health endpoint:

```bash
gcloud run services describe temp-mail-generator \
  --region europe-west1 \
  --format='value(status.url)'

curl -i https://YOUR_CLOUD_RUN_URL/api/health
```

## Connect `temp-mail-generator.site`

After the service is working, use **Cloud Run → Domain mappings → Add mapping**. Verify ownership of `temp-mail-generator.site`, select the Cloud Run service, and add the DNS records Google displays at your registrar.

Google-managed TLS provisioning can take time. Do not change MX records for the website mapping. Web hosting DNS and inbound email DNS are separate; the current application continues to receive temporary mail through Mail.tm provider domains.

Cloud Run domain mappings are currently a limited/Preview feature. For a higher-control production setup, place a global external HTTPS Load Balancer in front of Cloud Run and configure the custom domain there.

## Troubleshooting

### Build fails at dependency installation

Confirm that the GitHub build is using the repository-root `Dockerfile` and that `pnpm-lock.yaml` is committed. Do not use a static Vite-only build configuration; the API server is required for mailbox creation and inbox polling.

### Container fails to start

The container must listen on the port Cloud Run provides. This project uses `PORT=8080` in the image and reads `process.env.PORT` in the server.

### The website loads but mail does not work

Check the Cloud Run logs and test `/api/health`. Confirm that the service can reach `api.mail.tm`, the request is not being rate-limited, and `JWT_SECRET` is configured. The website domain does not become an email domain automatically.

### GitHub deploy does not trigger

Check the Cloud Build trigger connected to the correct repository, branch, and region. Confirm the Cloud Build service account has permission to build images and deploy Cloud Run revisions.

## Local validation before pushing

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run build
```
