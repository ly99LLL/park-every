# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

心流花园 (Mind Garden) is an Electron desktop app that combines philosophical journaling with AI emotion analysis and 3D visualization. Users write thoughts → DeepSeek AI analyzes the emotion → a glowing orb appears in a Three.js star garden.

## Commands

```bash
# Development (web mode — Express server only, no Electron)
npm start                    # Start server at http://localhost:3000
npm run dev                  # Same as start

# Electron desktop app
npm run electron             # Launch Electron window (production mode)
npm run electron:dev         # Launch Electron with DevTools open

# Build
npm run build:dir            # Build Windows portable (dir output — faster)
npm run build                # Build Windows NSIS installer

# Seed demo data (server must be running first)
node scripts/seed-garden.js  # Submit 30 Chinese diary entries via API

# Build portable manually (custom asar script)
node scripts/build-portable.js
```

## Architecture

### Process Model

```
Electron Main (main.js)
  ├── forks → Express Server (server.js) as child_process
  │             ├── src/ai.js      — DeepSeek API emotion analysis
  │             ├── src/db.js      — sql.js (pure JS SQLite)
  │             └── src/prompts.js — 50+ philosophical prompts
  ├── serves → public/index.html   — SPA frontend (no framework)
  └── bridges → preload.js         — contextBridge for IPC
```

**Key architectural decisions:**
- The Express server runs inside the Electron main process via `child_process.fork()`, not in the renderer. This keeps the server alive when the window closes and avoids renderer restrictions.
- `sql.js` (SQLite compiled to WASM/JS) was chosen over `better-sqlite3` to avoid native module rebuild issues with Electron.
- The frontend is a single HTML file with all JS inlined (~1400 lines) — no bundler, no framework. Three.js loads from CDN via importmap.
- AI emotion analysis has a **graceful degradation path**: DeepSeek API → keyword fallback (20+ patterns in `ai.js`, also duplicated client-side for real-time preview).

### Data Flow

```
User types → client-side keyword pre-check (instant)
           → POST /api/thoughts
               → server: src/ai.js analyzes emotion (DeepSeek or fallback)
               → server: src/db.js saves to SQLite (thoughts table)
               → returns { emotion, color, tags, depth, reflection, thought }
           → client: particle bloom animation at textarea position
           → client: new 3D sphere added to Garden3D scene
```

### Database Schema (src/db.js)

Three tables in a single SQLite file (`data/garden.db`):
- `thoughts` — id, content, emotion, color, position_x/y/z (3D coords), created_at
- `reflections` — id, thought_id (FK), prompt, response, created_at
- `garden_state` — singleton row (id=1) tracking total_thoughts, last_visit, garden_age_days

The DB file is rewritten entirely on every write (`saveToFile()` after each mutation via `db.export()`). This is simple and works for the expected data volume (hundreds, not millions of thoughts).

### Frontend Class Structure (index.html)

- **`ParticleSystem`** — Canvas 2D particle background. Binds mouse move, window resize, textarea focus/blur. Exposes `bloom(x, y, color)` for submit animation.
- **`AmbientSound`** — Web Audio API drone synth. 5 sine oscillators (A1–E4) with individual LFO modulation. `respondToEmotion(emotion)` shifts frequencies by ratio.
- **`Garden3D`** — Three.js scene manager. Creates spheres with nested halos and orbit rings. Handles click raycasting, hover detection, thought detail panel.
- **`App`** — Top-level controller. Manages 3 views (write/garden/memories), orchestrates API calls, binds UI events.

### Key Patterns

- **Zero framework frontend**: All DOM manipulation is direct. No React/Vue/Svelte. CSS uses CSS custom properties for theming.
- **Emotion → Color mapping**: Defined in both `src/ai.js` (server-side, 40+ emotions) and `src/prompts.js` (simpler 15-emotion map for prompts module). The HTML also has a client-side copy for real-time preview. Keep these in sync when adding emotions.
- **AI fallback chain**: The emotion analysis tries DeepSeek API → if that fails, falls back to keyword matching (Chinese keyword patterns in `ai.js:fallbackAnalyze()`). If even keyword matching finds nothing, defaults to "思考" (thinking) with color `#9bb0d0`.
- **Position generation**: New thoughts are placed in 3D space using spherical coordinates with random radius (3-8), theta (0-2π), and phi (π*0.2 to π*0.8) to create an organic distribution.
- **Electron data paths**: In dev mode, data goes to `project/data/`. In packaged mode (`app.isPackaged`), it goes to `process.resourcesPath/data/` (set up via `extraResources` in package.json build config).

## Environment

- `.env` file (gitignored) can contain `DEEPSEEK_API_KEY=sk-...` for AI analysis
- `.env.example` is the template; copy to `.env` to enable AI
- Without API key, the app works fully offline with keyword-based emotion detection
- `DB_PATH` env var (set automatically by Electron main process) overrides the SQLite file location

## Technical Notes

- **Node.js version**: Requires Node.js 18+ (Electron 42 bundles its own Node). `sql.js` needs WASM support.
- **Windows-only build config**: The `build.win` section targets portable x64. macOS/Linux builds would need additional `build` config.
- **Build size optimization**: `scripts/build-portable.js` manually filters `node_modules` — it copies only runtime dependencies (express, sql.js) and skips build tools (electron-builder, asar, etc.). The electron dist itself is copied separately.
- **Single instance lock**: `app.requestSingleInstanceLock()` in `main.js` prevents multiple windows.
- **Security**: `contextIsolation: true`, `nodeIntegration: false` in the BrowserWindow. The preload only exposes platform info via `contextBridge`.
