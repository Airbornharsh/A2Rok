# A2Rok

Tunnel local HTTP, HTTPS, and WebSocket services to the cloud with a managed domain and browser-based dashboard.

## Demo

- **Live app:** https://a2rok.harshkeshri.com/
- **Video walkthrough:** https://youtu.be/TndC2kiuhr8

## Architecture Overview

| Component       | Description                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cloud-server/` | Node.js + Express REST API with MongoDB for users, domains, and terminal sessions. Hosts the WebSocket broker that relays tunneled traffic between visitors and the CLI. |
| `frontend/`     | Next.js dashboard secured with Clerk. Users manage domains, monitor tunnel activity, and link the CLI via browser authentication.                                        |
| `local-server/` | TypeScript CLI (`a2rok`) that authenticates against the cloud service, opens a persistent WebSocket tunnel, and streams local traffic through the assigned domain.       |

High-level flow:

1. User signs in with Clerk on the frontend; the cloud server syncs profile data into MongoDB and issues a unique subdomain.
2. The CLI creates a terminal session, opens the browser for approval, and exchanges the validated session for a `Terminal` JWT.
3. When the CLI connects, the cloud server binds the user’s domain to that tunnel. Incoming requests for `*.a2rok-server.harshkeshri.com` are proxied over the WebSocket to the local machine and responses are streamed back, including binary payloads and WebSocket upgrades.

## Prerequisites

- Node.js 20+ (the CLI relies on the built-in `WebSocket` constructor)
- pnpm 9+ (recommended) or npm
- MongoDB instance (default connection string: `mongodb://localhost:27017/db`)

## Setup

### 1. Cloud Server (`cloud-server/`)

```bash
cd /Users/airbornharsh/Documents/Programming/Development/A2Rok/cloud-server
pnpm install
cp .env.example .env   # create and populate if needed
pnpm dev               # starts Express + WebSocket server on port 6511
```

Environment variables (defaults shown in `src/config/config.ts`):

- `PORT` – API/WebSocket port (default `6511`)
- `MONGO_URL` – MongoDB connection string without database suffix (default `mongodb://localhost:27017`)
- `FRONTEND_URL` – CORS origin for the dashboard
- `JWT_SECRET` – Secret used to sign terminal session JWTs

### 2. Frontend (`frontend/`)

```bash
cd /Users/airbornharsh/Documents/Programming/Development/A2Rok/frontend
pnpm install
cp .env.example .env.local   # supply Clerk keys + backend URL
pnpm dev                     # serves the dashboard on http://localhost:6011
```

Key environment variables:

- `NEXT_PUBLIC_BACKEND_URL` – Points to the running cloud server
- `NEXT_PUBLIC_FRONTEND_URL` – Public URL for deep links
- `NEXT_PUBLIC_IS_PRODUCTION` – Toggle for domain formatting utility
- Clerk publishable and secret keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)

### 3. CLI (`local-server/`)

Install dependencies and build once:

```bash
cd /Users/airbornharsh/Documents/Programming/Development/A2Rok/local-server
pnpm install
pnpm build
npm link   # exposes the CLI globally as `a2rok`
```

## CLI Usage

```bash
# Sign in (opens the browser to approve the session)
a2rok login

# Show the authenticated account
a2rok user

# Expose a local HTTP server
a2rok http 3000

# Expose an external HTTPS endpoint
a2rok https https://my-domain.com

# Tunnel a WebSocket server
a2rok ws ws://localhost:8080
```

During an active tunnel the CLI renders a live dashboard with request counts, status codes, and WebSocket activity. Press `Ctrl+C` to terminate the session.
