# Repo migration — use this codebase as your new GitHub repo

The old GitHub repo was owned by someone who has left; you no longer have access. This document explains how to use **this codebase** as your new canonical repo.

---

## 1. Create a new repo on GitHub (that you own)

1. Go to **https://github.com/new**
2. Choose:
   - **Repository name**: e.g. `toyflix_V3` (or any name you prefer)
   - **Owner**: your GitHub user or org
   - **Private** or **Public** as you like
3. Do **not** tick “Add a README” (this project already has files).
4. Click **Create repository**.

---

## 2. Point this project to the new repo

In the project root (this folder), run:

```bash
# Remove the old remote (if it was set to the previous person's repo)
git remote remove origin

# Add your new repo as origin (replace with your actual URL)
git remote add origin https://github.com/vikramtoyflix/toyflix_V3.git

# Or with SSH:
# git remote add origin git@github.com:vikramtoyflix/toyflix_V3.git
```

---

## 3. Push the code

```bash
# Push main branch
git push -u origin main

# If you use the toyflix_3_0 branch for deployment, push it too
git push -u origin toyflix_3_0
```

When prompted for credentials, use your GitHub username and a **Personal Access Token** (not your account password):

- Create a token: https://github.com/settings/tokens  
- **Generate new token (classic)** → tick **repo** → Generate, then paste the token when the terminal asks for a password.

---

## 4. Reconnect Azure Static Web App to the new repo

1. **Azure Portal** → your **Static Web App** (e.g. toyflix).
2. Go to **Settings** (or **Configuration**).
3. Under **Source** / **Deployment**:
   - **Source**: GitHub
   - **Organization**: your GitHub username (or org)
   - **Repository**: the new repo you created (e.g. `toy-joy-box-club`)
   - **Branch**: e.g. `main` or `toyflix_3_0` (whatever branch you deploy from)
4. If Azure asks to re-authorize or connect, approve so it can read from the new repo.
5. Save. Trigger a **Redeploy** from the Overview if you want an immediate build.

---

## 5. GitHub Actions secret (Azure token)

The workflow file (`.github/workflows/azure-static-web-apps-orange-smoke-06038a000.yml`) expects this secret in the **new** repo:

- **Name**: `AZURE_STATIC_WEB_APPS_API_TOKEN_ORANGE_SMOKE_06038A000`
- **Value**: from Azure → Static Web App → **Manage deployment token** → copy

In the **new** GitHub repo:

1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN_ORANGE_SMOKE_06038A000`  
   Value: the token you copied from Azure

After this, pushes to the configured branch will deploy from your new repo.

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Create a new GitHub repo (you as owner) |
| 2 | `git remote remove origin` then `git remote add origin <your-new-repo-url>` |
| 3 | `git push -u origin main` (and `toyflix_3_0` if needed) |
| 4 | In Azure, point the Static Web App to the new repo and branch |
| 5 | In the new repo, add the Azure deployment token as the Actions secret |

This codebase is now the single source of truth; the old repo is no longer needed.
