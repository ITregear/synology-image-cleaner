# Synology Image Cleaner

A keyboard-driven web app for reviewing and cleaning up duplicate images on Synology NAS. Inspired by Superhuman's efficient, hotkey-focused interface. Works entirely over SSH/SFTP (no local mounts required).

## Overview

This app helps you:
- Review duplicate files with a fast, keyboard-driven workflow
- Compare backup copies vs. sorted copies side-by-side
- Safely remove duplicates by moving them to recycle bin (non-destructive)
- Achieve "Inbox Zero" for your duplicate images
- Work from any machine with SSH access to your NAS

### Key Features

- **Keyboard-First Interface**: Navigate and review duplicates without touching your mouse
- **Single-Page Design**: Everything accessible from one unified inbox view
- **Real-time Feedback**: Instant visual indicators for actions and selections
- **Settings Sidebar**: Quick access to configuration without leaving your workflow

## Safety Features

- **Never uses `rm`** - All deletions are implemented as moves to recycle bin
- **Non-destructive** - Files are moved to Synology's recycle bin, not permanently deleted
- **Audit logging** - All actions are logged locally for review and resume capability
- **Background queue** - NAS operations run in background, UI stays responsive

## Project Structure

```
.
├── backend/          # FastAPI backend
├── frontend/         # React + Vite frontend
├── state/            # Local state (SQLite, cache, logs) - created at runtime
├── .env.example      # Configuration template
└── README.md
```

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- SSH access to your Synology NAS

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd synology-image-cleaner
   ```

2. **Set up Python backend:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```

3. **Set up frontend:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your NAS credentials and paths
   ```

### Configuration (.env)

Required variables:
- `NAS_HOST` - Your Synology NAS IP or hostname
- `NAS_USER` - SSH username
- `NAS_PASSWORD` - SSH password (optional if using key auth)
- `NAS_SSH_KEY_PATH` - Path to SSH private key (optional)
- `NAS_REPORTS_ROOT` - Remote path to Storage Analyzer reports folder
- `BACKUP_ROOT` - Remote absolute path to Photos Backup share root
- `SORTED_ROOT` - Remote absolute path to sorted photos root

Optional:
- `NAS_PORT` - SSH port (default: 22)
- `NAS_SSH_KEY_PASSPHRASE` - Passphrase for SSH key
- `LOCAL_STATE_DIR` - Local folder for state files (default: ./state)
- `RECYCLE_DIR_NAME` - Recycle bin folder name (auto-detected if empty)
- `THUMB_MAX_SIZE` - Maximum thumbnail size in pixels (default: 512)

## Running

### Development Mode

1. **Start backend:**
   ```bash
   source venv/bin/activate
   uvicorn backend.main:app --reload --port 8000
   ```

2. **Start frontend (in another terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open browser:**
   Navigate to `http://localhost:5173`

## Usage

### Keyboard Shortcuts

The app is designed for keyboard-driven efficiency:

- `S` - Open settings sidebar
- `K` - Start a new scan
- `C` - Cycle between Duplicates/Missing tabs
- `←/→` - Cycle between backup and kept images
- `E` - Ignore/mark as done (won't show again)
- `D` - Delete backup copy (moves to recycle bin)
- `⌘Z / Ctrl+Z` - Undo last action
- `?` - Show keyboard shortcuts help
- `Esc` - Close modals/sidebars

### Workflow

1. **First Time Setup**: Press `S` to open settings and configure your paths
2. **Scan for Duplicates**: Press `K` to initiate a scan
3. **Review**: Use arrow keys to cycle between images, press `E` to ignore or `D` to delete
4. **Achieve Inbox Zero**: Clear all duplicates and celebrate! 🎉
5. **Scan Again**: Press `K` anytime to run a new scan

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Backend serves static files in production
# Update backend/main.py to serve from frontend/dist
```

## Development Stages

This project is built in stages:

- **Stage 1** ✅: Barebones web app (current)
- **Stage 2**: Full frontend UI skeleton
- **Stage 3**: Backend remote connection + report discovery
- **Stage 4**: MVP wiring (parse reports, show real previews)
- **Stage 5**: Delete actions + background job queue

## Assumptions

- Storage Analyzer reports are located in a consistent folder structure
- Recycle bin folder follows Synology naming conventions (`#recycle`, `@Recycle`, `@recycle`, or `.recycle`)
- SSH/SFTP access is available and credentials are valid
- Report database schema may vary by DSM version (DB-first, CSV fallback implemented)

## License

MIT
