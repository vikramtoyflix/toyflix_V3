# Toyflix 3.0 — Deploy steps (simple guide)

Use **your own GitHub repo** (see [REPO_MIGRATION.md](./REPO_MIGRATION.md) if you're moving from an old repo you no longer have access to).

---

## PART 1: Upload your code to GitHub

### Step 1: Open Terminal on your Mac

- In **Cursor** (or VS Code): menu **Terminal** → **New Terminal**
- Or press **Ctrl + `** (backtick) or **Cmd + J** to open the terminal at the bottom

### Step 2: Go to your project folder

```bash
cd /Users/vikrama.m/Documents/toy-joy-box-club-main
```

### Step 3: Set the remote to your repo (if not done yet)

```bash
# If you already have a remote from the old repo, remove it first:
# git remote remove origin

git remote add origin https://github.com/vikramtoyflix/toyflix_V3.git
```

### Step 4: Push the main branch to GitHub

```bash
git push -u origin main
```

- If it asks for **username**: type your GitHub username and press Enter  
- If it asks for **password**: do **not** use your normal GitHub password. Use a **Personal Access Token**:
  1. In a browser go to: https://github.com/settings/tokens
  2. Click **"Generate new token (classic)"**
  3. Name it e.g. "Toyflix deploy", tick **repo**, then **Generate token**
  4. Copy the token (starts with `ghp_...`) and paste it in the terminal when it asks for password (you won't see it as you type — that's normal)

If you see something like "Everything up-to-date" or "branch main set up to track…" → **Step 4 is done.**

### Step 5: Push the toyflix_3_0 branch (if you use it)

```bash
git push -u origin toyflix_3_0
```

No password again if you just did it. When it finishes without errors, **Part 1 is done.** Your code is on GitHub at your repo URL.

---

## PART 2: Point Azure so the site deploys from GitHub

### Step 6: Open Azure Portal

1. Go to: **https://portal.azure.com**
2. Sign in with the account that has your Toyflix Static Web App.

### Step 7: Open your Static Web App

1. In the search bar at the top, type **Static Web Apps**
2. Click **Static Web Apps**
3. Click your Toyflix app (name might be like "orange-smoke-06038a000" or "toyflix").

### Step 8: Connect to GitHub and set branch

1. In the left menu, click **Settings** (or **Configuration**).
2. Find the **Source** or **Deployment** section (where it says where the code comes from).
3. Click **"Manage deployment token"** or **"Connect to GitHub"** / **"Edit"** (wording can vary).
4. Set:
   - **Source**: GitHub  
   - **Organization**: **vikramtoyflix**  
   - **Repository**: **toyflix_V3**  
   - **Branch**: **main** or **toyflix_3_0** (whichever you deploy from)  
5. Click **Save** or **Apply**.

### Step 9: Set build settings (if Azure shows them)

Make sure these match (often they are already correct):

- **App location**: `/`  
- **Output location**: `dist`  
- **Build command**: `npm run build`  

Save if you changed anything.

### Step 10: Trigger a deploy (if it didn't start automatically)

1. In the left menu, click **Overview**
2. Look for **"Manage deployment"** or **"Deployment center"** or **"Redeploy"**
3. If there is a **Redeploy** or **Sync** button, click it so Azure builds from your branch now.

---

## Done

- Your code is on **https://github.com/vikramtoyflix/toyflix_V3**.
- Azure is using your chosen branch to build and deploy your site (e.g. toyflix.in).

If any step fails, copy the exact error message and the step number and share it so we can fix it.
