# Deploy checklist — SpaceXEY

Target stack: **frontend on Cloudflare Pages** (static) + **backend on Google Cloud Run**
(scale-to-zero container) + **GitHub Actions** for auto-deploy. All of this fits in free
tiers at hobby traffic. The order below avoids the two circular dependencies:
the frontend needs the backend URL, and the backend's CORS needs the frontend URL.

> Alternative if a **predictable bill** matters more than scale-to-zero: run the backend on
> a flat ~$5/mo VPS instead of Cloud Run (immune to "denial of wallet"). Skip the Cloud Run
> rows and just `docker compose up` the backend behind nginx. Everything else is the same.

---

## Phase 0 — Repo & prep

- [ ] `git init` (this folder is **not** a git repo yet), then commit and push to GitHub.
- [ ] Confirm `.gitignore` excludes `node_modules/`, `.venv/`, `dist/`, `__pycache__/`, `.env`.
- [ ] Decide: keep cheats code, or delete it for prod (see README "Removing cheats mode").
      Either way, **cheats must be OFF in prod** (`CHEATS_ENABLED` unset/false,
      `VITE_CHEATS` unset at build time).
- [ ] Sanity check locally: `docker compose up --build` and play one full run end-to-end.

## Phase 1 — Accounts & APIs

- [ ] Create a **Cloudflare** account.
- [ ] Create a **Google Cloud** account, a new **project**, and **enable billing**.
- [ ] Enable GCP APIs: Cloud Run, Cloud Build, Artifact Registry, IAM Credentials.
      `gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com`
- [ ] Install + auth the CLI locally: `gcloud auth login` and `gcloud config set project <PROJECT_ID>`.

## Phase 2 — Backend first (Cloud Run) → get its URL

- [ ] Deploy from source (uses your existing `backend/Dockerfile`):
      ```bash
      gcloud run deploy spacexey-api \
        --source backend \
        --region us-central1 \
        --allow-unauthenticated \
        --max-instances 3 \
        --set-env-vars CHEATS_ENABLED=false,CORS_ORIGINS=http://localhost:5173
      ```
      (`--max-instances 3` is the wallet cap. CORS is a placeholder until Phase 3.)
- [ ] Copy the printed **`*.run.app` URL** — you need it next.
- [ ] Verify: open `<run-url>/api/health` → `{"status":"ok"}`.

## Phase 3 — Frontend (Cloudflare Pages) → get its URL

- [ ] In Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
- [ ] Build settings: **root directory** `frontend`, **build command** `npm run build`,
      **output directory** `dist`.
- [ ] Add a Pages **environment variable**: `VITE_API_BASE = <your *.run.app URL>`
      (build-time; a redeploy is needed if you change it later).
- [ ] Deploy, then copy the **`*.pages.dev` URL**.

## Phase 4 — Close the loop (CORS)

- [ ] Update the backend's allowed origin to the real frontend URL and redeploy:
      ```bash
      gcloud run services update spacexey-api --region us-central1 \
        --set-env-vars CHEATS_ENABLED=false,CORS_ORIGINS=https://<your>.pages.dev
      ```
- [ ] Verify in a browser: load the Pages URL, play a full run, confirm no CORS errors in
      the console and the ending screen resolves.

## Phase 5 — GitHub Actions auto-deploy

- [ ] **Frontend:** nothing to do — Cloudflare Pages' Git integration already redeploys on
      push. (Only add an Actions workflow if you want to gate deploys on tests first.)
- [ ] **Backend — set up Workload Identity Federation** (no long-lived keys in GitHub):
  - [ ] Create a deployer service account with roles: `run.admin`, `iam.serviceAccountUser`,
        `cloudbuild.builds.editor`, `artifactregistry.writer`, `storage.admin`.
  - [ ] Create a WIF pool + provider bound to your GitHub repo, and allow the SA to be
        impersonated by that repo. (One-time; follow
        `google-github-actions/auth` WIF docs.)
- [ ] Add GitHub repo **secrets**: `WIF_PROVIDER`, `GCP_SA_EMAIL`.
- [ ] Add `.github/workflows/deploy-backend.yml` (triggers on `paths: ['backend/**']`,
      `id-token: write`, auth via WIF, then `gcloud run deploy --source backend
      --max-instances 3 ...`).
- [ ] Push a backend change and confirm the workflow deploys green.

## Phase 6 — Wallet & abuse guardrails

- [ ] Cloud Run `--max-instances` set (done in Phase 2) — hard ceiling on worst-case spend.
- [ ] Create a **GCP Budget alert** (Billing → Budgets & alerts) — email at, say, $5 and $20.
- [ ] If/when on a custom domain via Cloudflare proxy: add a **per-IP rate-limit rule**
      + enable **Bot Fight Mode**.
- [ ] Add **cache headers** (or a Cloudflare cache rule) for the static endpoints
      `/api/meta`, `/config`, `/api/companies`, `/api/people` so repeat hits skip the origin.

## Phase 7 — Analytics (optional, for the "X unique users" number)

- [ ] Enable **Cloudflare Web Analytics** for the Pages site (auto-injected, no code, since
      it's on Cloudflare). Or rely on Pages/zone request analytics (also no code).

## Phase 8 — Custom domain (optional)

- [ ] Get a domain: free `*.pages.dev` / `*.run.app` are fine to start; or a free subdomain
      (`is-a.dev`, `eu.org`); or buy one (~$10/yr, **Cloudflare Registrar** = at-cost).
- [ ] Point **apex → Pages** (custom domain in Pages) and **`api.` → Cloud Run**
      (Cloud Run custom domain mapping, or Cloudflare proxy).
- [ ] Update `CORS_ORIGINS` (backend) and `VITE_API_BASE` (Pages) to the custom domain and
      redeploy both.

## Phase 9 — Final verification

- [ ] Cheats are off: no "CHEATS ON" badge in prod; `/api/meta` shows `cheats_enabled:false`.
- [ ] Full run works on the live URL (setup → draft → resolve → ending → share).
- [ ] Backend tests pass in CI (`cd backend && pytest`) before deploy, if you gate on them.
