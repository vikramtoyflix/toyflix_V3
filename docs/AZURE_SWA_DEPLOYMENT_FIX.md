# Fix: "No matching Static Web App environment was found"

This error occurs when the build succeeds but the deployment token is invalid or the Azure Static Web App no longer exists.

## Quick Fix (recommended)

### 1. Get a fresh deployment token from Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Open your **Static Web App** (e.g. "happy-island")
3. Go to **Settings** → **Deployment token** (or **Manage deployment token**)
4. Copy the token

### 2. Update the GitHub secret

1. Go to your GitHub repo: `https://github.com/vikramtoyflix/toyflix_V3`
2. **Settings** → **Secrets and variables** → **Actions**
3. Update or create: `AZURE_STATIC_WEB_APPS_API_TOKEN_HAPPY_ISLAND_014A14D00`
4. Paste the new token

### 3. Re-run the workflow

- **Actions** → select the failed workflow → **Re-run all jobs**

---

## If the Static Web App was deleted

Create a new Static Web App and link it to this repo:

1. Azure Portal → **Create a resource** → **Static Web App**
2. Fill in:
   - **Subscription** and **Resource group**
   - **Name**: e.g. `toyflix-prod`
   - **Deploy** → **GitHub** → authorize and select `vikramtoyflix/toyflix_V3`
   - **Branch**: `main`
   - **Build Presets**: Custom
   - **App location**: `/`
   - **Output location**: `build`
   - **Build command**: `npm run build && cp -r dist build`
3. Under **Deployment** → set **Deployment authorization** to **Deployment token**
4. After creation, Azure will add a new workflow. You can replace the existing one or use the new deployment token in the current workflow.

---

## Verify workflow configuration

The workflow expects:
- **Build output**: `build/` (Vite outputs to `dist/`, we copy to `build/`)
- **Secret**: `AZURE_STATIC_WEB_APPS_API_TOKEN_HAPPY_ISLAND_014A14D00`

If you created a new SWA with a different name, the secret name will differ. Update the workflow file to use the correct secret name from the new SWA's GitHub integration.
