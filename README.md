# MEMORA — AI Personal Second Brain

A personal life-memory repository to record daily memories, track goals and projects, capture ideas, and ask AI questions grounded in your stored memories.

---

## Running in VS Code

### 1. Open the Folder in VS Code
Open this project root directory in VS Code.

### 2. Install Dependencies
Open the VS Code Integrated Terminal (`Ctrl + \`` or ``Cmd + \``) and run:
```bash
npm install
```

### 3. Environment Variables (Optional for AI)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Gemini API Key in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Start the Application
You can run the app using any of the following methods in VS Code:

- **Via Terminal:**
  ```bash
  npm run dev
  ```
  The server will start on [http://localhost:3000](http://localhost:3000).

- **Via VS Code Run & Debug (F5):**
  Open the Run & Debug panel (`Ctrl+Shift+D` / `Cmd+Shift+D`) and select:
  - **`Dev Server (Fullstack)`** to run the backend and frontend.
  - **`Fullstack: Server + Chrome`** to start the server and open Chrome automatically.

- **Via Build Task:**
  Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on macOS) to run the `npm: dev` task.

---

## Authentication in VS Code (`http://localhost:3000`)

### Email & Password Sign-In (Recommended for Localhost)
Because Firebase Starter Tier projects restrict editing Google OAuth Authorized Domains:
1. Navigate to [http://localhost:3000](http://localhost:3000).
2. Click the **"Create Account"** tab.
3. Enter your Name, Email (`perlaanvimaddhi@gmail.com`), and Password (6+ characters).
4. Click **"Create Personal Second Brain"**.

This authenticates directly with Firebase Authentication and connects to your cloud Firestore database without domain restrictions.

### Google One-Click Sign-In (Cloud Run URL)
Google Sign-In is pre-authorized on the hosted Cloud Run URLs:
- **Dev App:** `https://ais-dev-lr6dga5tq52npxwpaax2m5-286814821775.asia-east1.run.app`

---

## Firebase Configuration

Your Firebase database and authentication configuration are set in `firebase-applet-config.json`:
- **Project ID:** `memora-ai-6ebfd`
- **Firestore Database ID:** `(default)`
- **Security Rules:** `firestore.rules` (deployed with strict user isolation per collection)

---

## Available Scripts

- `npm run dev` — Starts the Express + Vite server with Hot Reload on port 3000.
- `npm run lint` — Runs TypeScript type-checking (`tsc --noEmit`).
- `npm run build` — Builds client and server bundles for production.
- `npm start` — Runs the compiled production build from `dist/server.cjs`.
