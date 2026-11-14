# Cloud Run Rollback Runbook (`frontend`)

This document describes how to roll back `frontend-staging` or `frontend-prod` on Cloud Run.

## 1. Automated Safeguards

- Runtime configuration (`/config.json`) is generated at container startup from the Cloud Run environment (`API_BASE_URL`, `USE_MOCKS`), so images are environment-agnostic and immutable (`<region>-docker.pkg.dev/<project>/<repo>/frontend:<git-sha>`).
- Cloud Run checks `GET /healthz` before shifting traffic to a new revision.
- Authentication uses Workload Identity Federation via encrypted GitHub Environment Secrets (`GCP_WIF_PROVIDER`, `GCP_SA_CI_DEPLOYER`, `GCP_PROJECT_ID`, `GCP_REGION`, `GAR_REPOSITORY`).

---

## 2. Immediate Traffic Rollback

### Step 1: List recent revisions

```bash
ENV="staging" # or "prod"
gcloud run revisions list \
  --service="frontend-${ENV}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --limit=5
```

### Step 2: Shift 100% of traffic to the previous healthy revision

```bash
PREVIOUS_REVISION="frontend-staging-00001-xyz"
gcloud run services update-traffic "frontend-${ENV}" \
  --to-revisions="${PREVIOUS_REVISION}=100" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}"
```

### Step 3: Verify `/healthz` and `/config.json`

```bash
SERVICE_URL="$(gcloud run services describe "frontend-${ENV}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --format='value(status.url)')"
curl -fsS "${SERVICE_URL}/healthz"
curl -fsS "${SERVICE_URL}/config.json"
```
