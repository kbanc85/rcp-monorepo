# RCP (Right-Click Prompt) - AI Prompt Manager

A monorepo containing the RCP dashboard and Chrome extension.

## Structure

```
rcp/
├── apps/
│   ├── dashboard/      # Next.js web dashboard
│   └── extension/      # Chrome extension (sidepanel)
├── packages/
│   ├── types/          # Shared TypeScript types (@rcp/types)
│   ├── ui/             # Shared UI components (@rcp/ui)
│   └── utils/          # Shared utilities (@rcp/utils)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Installation

```bash
pnpm install
```

### Development

Run the dashboard:
```bash
pnpm dev:dashboard
```

Run the extension:
```bash
pnpm dev:extension
```

### Building

Build all packages:
```bash
pnpm build
```

Build specific app:
```bash
pnpm build:dashboard
pnpm build:extension
```

## Packages

### @rcp/types
Shared TypeScript type definitions for prompts, folders, subscriptions, and quick access items.

### @rcp/ui
Shared UI components built with Radix UI primitives and styled with Tailwind CSS.

### @rcp/utils
Shared utilities including the `cn()` class name helper and Framer Motion animation variants.
