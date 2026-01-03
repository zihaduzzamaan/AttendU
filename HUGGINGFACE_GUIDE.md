# 🚀 Hugging Face Spaces Deployment Guide

Follow these steps to move your AI backend from Render to Hugging Face for better stability and performance.

## Step 1: Push Your Local Changes
First, ensure the new files I created are on GitHub.
1. Save all files in your editor.
2. Open your terminal and run:
   ```bash
   git add .
   git commit -m "Add Dockerfile for Hugging Face and 128-d AI fix"
   git push origin main
   ```

## Step 2: Create a Hugging Face Space
1. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2. **Space Name**: `attendu-backend` (or any name you like).
3. **SDK**: Select **Docker**.
4. **Template**: Select **"Blank"**.
5. **Space Hardware**: Choose the default **"CPU Basic · 2 vCPU · 16 GB · Free"**.
6. **Visibility**: Public.
7. Click **"Create Space"**.

## Step 3: Deployment (Option A: Direct Git Push)
Every Space is its own Git repository. This is the most reliable way.
1. On your Space page, click the **"Files"** tab.
2. Click the **"Clone repository"** button (top right).
3. Copy the `git clone` command (example: `git clone https://huggingface.co/spaces/your-name/attendu-backend`).
4. In your terminal, run that command to create a new folder.
5. Copy your **`backend/` folder contents** (including the `Dockerfile`) into this new folder.
6. Run these commands inside that new folder:
   ```bash
   git add .
   git commit -m "Initial backend deploy"
   git push
   ```
   *(Note: You will need a Hugging Face [Access Token](https://huggingface.co/settings/tokens) as your password).*

## Step 4: Deployment (Option B: Easy Browser Upload)
If you don't want to use Git:
1. Go to the **"Files"** tab of your Space.
2. Click **"Add file"** -> **"Upload files"**.
3. **IMPORTANT**: You must upload the **ENTIRE FOLDERS**, not just the files inside them.
   - When you drag and drop, make sure you see the folder names (`services/`, `core/`) in the list.
   - If the folders don't appear, you can create them manually using the **"Add file" -> "Create a new file"** button and naming it `services/placeholder.txt` first.

### **The missing files in your current build:**
According to the logs, these are missing from your Space:
- `services/` (Folder)
- `services/face_logic.py`
- `services/__init__.py`
- `core/` (Folder)
- `core/config.py`
- `core/database.py`
- `core/__init__.py`
4. Click **"Commit changes to main"**.
5. Hugging Face will start building automatically!


## Step 4: Add Environment Variables (IMPORTANT)
If your Python backend needs Supabase keys or other secrets:
1. In the Space **Settings** tab, find **"Variables and secrets"**.
2. Add any keys you have in your local `backend/.env` file.
   - Example: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.

## Step 5: Get Your Live URL
1. Once the Space status says **"Running"** (this may take 2-3 minutes), look at the top of the page.
2. Click the **"..."** menu and select **"Embed this Space"**.
3. Copy the URL from the **"Direct URL"** box (e.g., `https://username-attendu-backend.hf.space`).

## Step 6: Update Frontend
1. Go back to your code in `frontend/src/services/api.ts`.
2. Replace the `https://arefin-attendu-backend.hf.space` with YOUR actual URL from Step 5.
3. Save and push again.

**Congratulations! Your AI backend is now powered by Hugging Face.** 🎉
