# Deploy Toyflix 3.0 to GitHub & Azure Static Web App

Use **your own GitHub repo**. If you're migrating from an old repo you no longer have access to, see [REPO_MIGRATION.md](./REPO_MIGRATION.md) first.

---

## Step 1: Push to GitHub (run in project root)

```bash
# Set your new repo as origin (replace with your URL)
# git remote remove origin   # if you had an old remote
# git remote add origin https://github.com/vikramtoyflix/toyflix_V3.git

# Push main branch
git push -u origin main

# Push toyflix_3_0 branch (if you use it for 3.0 release)
git push -u origin toyflix_3_0
```

If you haven't created the GitHub repo yet:

1. Go to https://github.com/new
2. Repository name: e.g. `toyflix_V3` (your choice)
3. Do **not** initialize with README (you already have files)
4. Create the repo, then run the push commands above.

---

## Step 2: Point Azure Static Web App to this repo

1. Open **Azure Portal** → your **Static Web App** (e.g. "orange-smoke-06038a000").
2. Go to **Settings** (left menu) or **Configuration**.
3. Under **Source**:
   - **Source**: GitHub (or change if it's already connected to another repo).
   - **Organization**: your GitHub org/username.
   - **Repository**: **toyflix_V3**.
   - **Branch**: select **`main`** or **`toyflix_3_0`** (whichever you use for deployment).
4. **Build details** (should match your workflow):
   - **App location**: `/`
   - **Output location**: `dist`
   - **App build command**: `npm run build`
   - **API location**: `api` (if you use Azure APIs)
5. Save. Azure will run the workflow on the next push (or trigger a redeploy from Overview → "Manage deployment" if needed).

---

## Step 3: GitHub secret (if new repo or new Static Web App)

Azure gives you an **API token** when you connect the Static Web App to GitHub. If you connected a **new** repo or Static Web App:

1. In Azure: Static Web App → **Manage deployment token** → copy token.
2. In GitHub: your repo → **Settings** → **Secrets and variables** → **Actions**.
3. Add secret: name = `AZURE_STATIC_WEB_APPS_API_TOKEN_ORANGE_SMOKE_06038A000` (or the name in your workflow file), value = the token.

If the Static Web App was already connected to this repo before, the secret may already be set.

---

## Summary

| Item | Value |
|------|--------|
| Your repo | `https://github.com/vikramtoyflix/toyflix_V3` |
| Branch for deploy | `main` or `toyflix_3_0` (set in Azure) |
| Build command | `npm run build` |
| Output folder | `dist` |

After pushing and setting the branch in Azure, the site (e.g. toyflix.in or your Static Web App URL) will deploy from your new repo.
