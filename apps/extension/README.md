# RCP v2.0 - Right Click Prompt

AI Prompt Manager Chrome Extension with Dashboard, Authentication, Cloud Sync & Team Collaboration.

## Directory Structure

```
v2.0/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── ui/              # shadcn/ui components
│   ├── features/            # Feature modules (v2.0)
│   │   ├── auth/            # Authentication (Email, Google OAuth)
│   │   ├── dashboard/       # Web dashboard & settings
│   │   ├── sync/            # Cloud sync (Supabase)
│   │   └── teams/           # Team workspaces (Enterprise)
│   ├── content/             # Content scripts (floating icon)
│   ├── services/            # Business logic services
│   ├── lib/                 # Utility functions
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── config/              # Configuration files
│   ├── assets/              # Static assets (icons, images)
│   ├── background.ts        # Service worker
│   ├── popup.tsx            # Extension popup UI
│   ├── popup.html           # Popup HTML template
│   └── style.css            # Global styles
├── public/                  # Static files
├── dist/                    # Build output
├── manifest.json            # Chrome extension manifest
├── package.json             # Dependencies
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── tailwind.config.js       # Tailwind CSS configuration
```

## Features

### Current (v1.x)
- [x] Right-click context menu for prompts
- [x] Folder organization
- [x] Auto-paste functionality
- [x] Toast notifications
- [x] Floating highlight icon
- [x] Import/Export prompts
- [x] Drag & drop reordering
- [x] Search functionality

### Planned (v2.0)
- [ ] **Authentication**
  - [ ] Email/Password sign-in
  - [ ] Google OAuth
  - [ ] Session management
- [ ] **Dashboard**
  - [ ] Web-based prompt management
  - [ ] Usage analytics
  - [ ] Settings sync
- [ ] **Cloud Sync**
  - [ ] Real-time sync with Supabase
  - [ ] Offline-first with conflict resolution
  - [ ] Multi-device support
- [ ] **Teams (Enterprise)**
  - [ ] Team workspaces
  - [ ] Shared prompt libraries
  - [ ] Role-based permissions
  - [ ] SSO integration

## Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup
```bash
cd v2.0
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Load Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `v2.0/dist` folder

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Build**: Vite, @crxjs/vite-plugin
- **Animation**: Framer Motion
- **Backend** (planned): Supabase
- **State**: React hooks + Chrome Storage API

## Migration from v1.x

The `_backup` folder contains all v1.x files:
- `_backup/archives/` - Old release zip files
- `_backup/docs/` - Previous documentation
- `_backup/old-versions/` - Legacy codebases
- `_backup/old-src/` - v1.x source files

## License

Private - All rights reserved
