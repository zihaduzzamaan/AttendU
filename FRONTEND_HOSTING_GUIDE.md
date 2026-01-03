# 🚀 Frontend Hosting Guide (Vercel)

Vercel is the best free hosting platform for React/Vite apps. It will automatically deploy your app whenever you push to GitHub.

## Step 1: Push Your Latest Code
Ensure all the Hugging Face URL fixes and TypeScript fixes are on GitHub.
```bash
git add .
git commit -m "Finalize production URLs and fix TypeScript errors"
git push origin main
```

## Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up with your **GitHub** account.
2. Click **"Add New..."** -> **"Project"**.
3. Import your **Attendance prototype** repository.

## Step 3: Configure Environment Variables (CRITICAL)
Before clicking "Deploy", you must add your Supabase keys so the online app can talk to your database.
1. Expand the **"Environment Variables"** section.
2. Add the following from your local `frontend/.env` file:
   - `VITE_SUPABASE_URL` = (Your Supabase URL)
   - `VITE_SUPABASE_ANON_KEY` = (Your Supabase Anon Key)

## Step 4: Deploy
1. Keep the default settings (Framework: **Vite**, Root Directory: **frontend**).
   - > [!IMPORTANT]
     > If your code is inside a folder named `frontend`, make sure the "Root Directory" in Vercel is set to `./frontend`.
2. Click **"Deploy"**.
3. In about 1 minute, you will get a live URL (e.g., `attendance-prototype.vercel.app`).

## Step 5: Test the Live App
Open your new Vercel URL and try:
1. **Logging in** (should work instantly).
2. **Taking Attendance** (should connect to your Hugging Face AI backend automatically).

**Your entire Attendance System is now live and free!** 🎉🏆
