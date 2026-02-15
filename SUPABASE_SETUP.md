# Supabase Setup for Transaction History

The Portfolio **History** tab shows transactions (swaps, bridges, sends, wrap/unwrap) performed through DeltaChainLabs. These are stored in Supabase.

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose your organization, name the project (e.g. `gasless-dex`), set a database password, pick a region
4. Click **Create new project** and wait for it to finish

---

## Step 2: Create the Transactions Table

1. In your Supabase project, open **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy and paste the entire contents of `supabase-schema.sql` from this repo
4. Click **Run** (or press Ctrl+Enter)

You should see "Success. No rows returned" — that's correct.

---

## Step 3: Get Your API Keys

1. Go to **Project Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. Copy these two values:
   - **Project URL** → use for `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key (under "Project API keys") → use for `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important:** Use the `service_role` key, not the `anon` key. The service role bypasses Row Level Security and is required for the API to read/write transactions.

---

## Step 4: Add to Your Environment

Add these to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your actual Project URL and service_role key.

---

## Step 5: Deploy (Vercel)

If you deploy to Vercel:

1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service_role key
3. Redeploy

---

## Verification

1. Run the app locally (`npm run dev`)
2. Connect your wallet
3. Perform a swap, send, or bridge
4. Go to **Portfolio** → **History** tab
5. You should see the transaction listed with "via DeltaChainLabs"

If History is empty or shows "No transactions yet", check:
- Supabase env vars are set in `.env.local`
- The SQL schema was run successfully
- You performed the transaction while connected (swaps/bridges/sends from this site are recorded)

---

## Without Supabase

If you don't set up Supabase, the app still works. The History tab will simply show "No transactions yet" and no errors. Transaction recording fails silently so it doesn't block the UX.
