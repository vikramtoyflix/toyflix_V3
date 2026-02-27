# Deploy Toyflix 3.0 to GitHub & Azure Static Web App

## Step 1: Push to GitHub (run in project root)

```bash
# Already done: git init, add, commit, branch toyflix_3_0

# Add your GitHub repo as remote (replace YOUR_USERNAME and YOUR_REPO with your GitHub username and repo name)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push main branch
git push -u origin main

# Push toyflix_3_0 branch (this is your 3.0 release)
git push -u origin toyflix_3_0
```

If you haven't created the GitHub repo yet:
1. Go to https://github.com/new
2. Repository name: e.g. `toy-joy-box-club` or `toyflix`
3. Do **not** initialize with README (you already have files)
4. Create, then use the repo URL in the `git remote add` command above.

---

## Step 2: Point Azure Static Web App to this repo

1. Open **Azure Portal** → your **Static Web App** (e.g. "orange-smoke-06038a000").
2. Go to **Settings** (left menu) or **Configuration**.
3. Under **Source**:
   - **Source**: GitHub (or change if it’s already connected to another repo).
   - **Organization**: your GitHub org/username.
   - **Repository**: the repo you pushed to.
   - **Branch**: select **`toyflix_3_0`** (so the app deploys from this version).
4. **Build details** (should match your workflow):
   - **App location**: `/`
   - **Output location**: `dist`
   - **App build command**: `npm run build`
   - **API location**: `api` (if you use Azure APIs)
5. Save. Azure will run the workflow on the next push to `toyflix_3_0` (or trigger a redeploy from Overview → "Manage deployment" if needed).

---

## Step 3: GitHub secret (if new repo or new Static Web App)

Azure gives you an **API token** when you connect the Static Web App to GitHub. If you connected a **new** Static Web App to this repo:

1. In Azure: Static Web App → **Manage deployment token** → copy token.
2. In GitHub: Repo → **Settings** → **Secrets and variables** → **Actions**.
3. Add secret: name = `AZURE_STATIC_WEB_APPS_API_TOKEN_ORANGE_SMOKE_06038A000` (or the name shown in your workflow file), value = the token.

If the Static Web App was already connected to this repo before, the secret is usually already set.

---

## Summary

| Item | Value |
|------|--------|
| Branch for 3.0 | `toyflix_3_0` |
| Azure build branch | Set to `toyflix_3_0` in portal |
| Build command | `npm run build` |
| Output folder | `dist` |

After pushing `toyflix_3_0` and setting the branch in Azure, the site at toyflix.in (or your Static Web App URL) will deploy from **toyflix_3_0**.
