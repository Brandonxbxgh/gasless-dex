# Deploy Your Gasless DEX (GitHub + Vercel)

Do these **once**. After that, every time you push to GitHub, Vercel will auto-deploy.

**Don’t have Git yet?** Install it first: **https://git-scm.com/download/win** — use the defaults, then close and reopen Cursor/terminal.

---

## Part 1: Put the code on GitHub

### Step 1 — Create a new repo on GitHub

1. Go to **https://github.com/new**
2. **Repository name:** `gasless-dex` (or whatever you like)
3. Leave it **Public**, don’t add a README (you already have one)
4. Click **Create repository**

### Step 2 — Open terminal in your project

In Cursor: press **Ctrl+`** to open the terminal, then run:

```bash
cd C:\Users\aaron\gasless-dex
```

### Step 3 — Turn the folder into a Git repo and push

Copy-paste these **one at a time** (replace `YOUR_GITHUB_USERNAME` with your actual GitHub username):

```bash
git init
git add .
git commit -m "Gasless DEX aggregator"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/gasless-dex.git
git push -u origin main
```

When it asks for login, use your GitHub username + a **Personal Access Token** (not your password). Get one here: **https://github.com/settings/tokens** → Generate new token (classic), tick `repo`, then paste the token when Git asks for a password.

---

## Part 2: Deploy on Vercel

### Step 1 — Sign in to Vercel

1. Go to **https://vercel.com**
2. Click **Sign Up** and choose **Continue with GitHub**
3. Authorize Vercel to use your GitHub

### Step 2 — Import your repo

1. On the Vercel dashboard, click **Add New…** → **Project**
2. Find **gasless-dex** in the list and click **Import**

### Step 3 — Add your env vars (so the live site has your keys)

Before clicking Deploy, open **Environment Variables** and add these (same as in your `.env.local`):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_ZERO_EX_API_KEY` | `107179a7-ccee-47d3-974c-e2aa41e61adb` |
| `NEXT_PUBLIC_ALCHEMY_BASE_URL` | `https://base-mainnet.g.alchemy.com/v2/3DZouaaaQISAr02DS2EaO` |
| `NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL` | `https://arb-mainnet.g.alchemy.com/v2/3DZouaaaQISAr02DS2EaO` |
| `NEXT_PUBLIC_ALCHEMY_POLYGON_URL` | `https://polygon-mainnet.g.alchemy.com/v2/3DZouaaaQISAr02DS2EaO` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `1b87eed7f2c6410b60d09176c5697710` |
| `NEXT_PUBLIC_SWAP_FEE_RECIPIENT` | `0x08C6D8196De6f610E93A30B82Fb9446B63A37A41` |

### Step 4 — Deploy

Click **Deploy**. Wait 1–2 minutes. Vercel will give you a link like:

**https://gasless-dex-xxxx.vercel.app**

That’s your live DEX. Share that link with anyone.

---

## After this

- **Change code?** Edit in Cursor, then in terminal:  
  `git add .` → `git commit -m "your message"` → `git push`  
  Vercel will redeploy automatically.
- **Secrets:** They’re only in Vercel (and your local `.env.local`). They are **not** in GitHub because `.env.local` is in `.gitignore`.
