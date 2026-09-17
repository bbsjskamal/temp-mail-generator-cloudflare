# Custom Domain & Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying your rebuilt **Temp-Mail-Generator.site** web application and configuring your custom domain (`temp-mail-generator.site`). The backend has been completely reconstructed to use a legitimate, server-owned **Mail.tm** session lifecycle. All client-side Firestore dependencies and non-functional Guerrilla Mail fallbacks have been removed.

---

## 1. Free & Fast Hosting Platform Comparison

To run this application with both its React frontend and Express API server without ongoing costs, the two most practical platforms are **Vercel** and **Google Cloud Run**.

| Hosting Platform | Free Tier Specifications | Latency & Cold Starts | Custom Domain & SSL | Recommended Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Vercel** | Generous free Hobby plan; includes 100 GB bandwidth, unlimited serverless function executions up to limits. | Instant edge routing globally for static assets; 200–400ms cold start for Node functions. | Fully automated Let's Encrypt SSL; 1-click apex (`@`) and `www` CNAME routing. | **Recommended for quick setup**, automatic continuous git deployments, and zero ops. |
| **Google Cloud Run** | 2 million requests/month free, 360,000 GB-seconds memory free, 180,000 vCPU-seconds free. | Fast Google edge infrastructure; container cold start is ~1–2 seconds when scaled to zero. | Managed domain mappings with automatic Google-managed TLS certificates. | **Recommended for strict container isolation**, high burst resilience, and enterprise scale. |
| **Manus WebDev** | Managed native runtime included with your session; 1 vCPU / 512 MiB managed container. | Sub-second response; instant dev server preview and 1-click production publishing. | Custom domain support directly through DNS mapping. | **Fastest instant deployment** directly from this environment. |

---

## 2. Option A: Deploying to Vercel (Fastest & Free)

Vercel natively supports this repository when using a serverless API adapter or using Vite + Node serverless functions.

### Step 1: Push the Source Code to GitHub
1. Initialize git in the project root:
   ```bash
   git init
   git add .
   git commit -m "feat: complete rebuilt backend with Mail.tm and responsive UI"
   ```
2. Create a new repository on your GitHub account (`temp-mail-generator`) and push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/temp-mail-generator.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** and select your GitHub repository.
3. In the project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist/public`
4. Deploy the project.

---

## 3. Option B: Deploying to Google Cloud Run (Free Tier)

Google Cloud Run gives you a dedicated container running the Express server and Vite production bundle.

### Step 1: Create a Containerfile / Dockerfile
A production-ready `Dockerfile` for Cloud Run:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### Step 2: Build and Deploy using Google Cloud CLI
```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project <YOUR_GCP_PROJECT_ID>

# Build image with Cloud Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/<YOUR_GCP_PROJECT_ID>/temp-mail-generator
gcloud run deploy temp-mail-generator \
  --image gcr.io/<YOUR_GCP_PROJECT_ID>/temp-mail-generator \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1
```

---

## 4. Connecting Your Domain: `temp-mail-generator.site`

Once your application is deployed on Vercel, Google Cloud Run, or Manus WebDev, configure your DNS records at your domain registrar (Namecheap, GoDaddy, Cloudflare, Hostinger, etc.).

### DNS Configuration Table

| Type | Name / Host | Value / Target | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (or leave blank) | `76.76.21.21` (for Vercel) *or* GCP IP | Automatic / 300 | Routes root domain `temp-mail-generator.site` to the web host. |
| **CNAME** | `www` | `cname.vercel-dns.com` (for Vercel) | Automatic / 300 | Routes `www.temp-mail-generator.site` to the web host. |
| **TXT** | `@` | Verification code (e.g. Google Search Console) | 3600 | Verifies domain ownership for Google Indexing and Bing Webmaster. |

> **Note on Mail Routing vs. Web Routing:**
> Your domain `temp-mail-generator.site` is used for **web traffic** (serving the user interface and API). Incoming emails are accepted by the disposable provider's mail exchange servers (such as `in.mail.tm` on active domains like `uberip.com`). You do **not** need to point your personal domain's MX records to Mail.tm unless you plan to run your own dedicated mail exchange server and configure SPF, DKIM, and reverse DNS.

---

## 5. Summary of Architecture Changes

1. **Failure Root Cause Fixed**: The previous implementation attempted to create and retrieve Mail.tm accounts on the client without storing account tokens and attempted to query an inactive Firestore database with client-side credential errors.
2. **Server-Owned Session Lifecycle**: When a visitor loads the site or clicks "New Email", `/api/mailbox/new` provisions an account via Mail.tm, generates a deterministic secure token, and caches it in the server process.
3. **In-Memory & Zero Logs**: Aligned with privacy regulations and user expectations, all active mailboxes expire after 10 minutes (extendable up to 60 minutes) and purge cleanly.
4. **Resilience & Throttling**: Added backoff and caching to respect Mail.tm's 8 QPS limit and prevent HTTP 429 rate limit responses.
