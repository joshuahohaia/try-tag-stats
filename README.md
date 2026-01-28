# Try Tag Stats

Track fixtures, standings, and stats for Try Tag Rugby leagues.

## Project Structure

This is a monorepo managed with npm workspaces:

- `packages/frontend`: React application built with Vite, Mantine UI, and TanStack Router.
- `packages/backend`: Node.js Express server with Turso (libSQL).
- `packages/shared`: Shared TypeScript types and Zod schemas used by both frontend and backend.

## Features

- **Leagues & Divisions**: Browse leagues and filter by region.
- **Standings**: Real-time division standings including points, wins, losses, and point difference.
- **Fixtures & Results**: Track upcoming matches and recent results.
- **Team Profiles**: Detailed team statistics, position history charts, and player awards.
- **Favorites**: Star your favourite teams for quick access to their fixtures and standings on the home page.
- **Settings**: Manage favorites and access support links.
- **Mobile Friendly**: Fully responsive design with a dedicated mobile navigation bar.

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm

### Installation

1. Install dependencies from the root:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in the root (if applicable) or check package-specific environment requirements.

3. Start development servers:
   ```bash
   # Start everything
   npm run dev
   ```

## Database & Data Synchronization

The project uses Turso (libSQL), a SQLite-compatible cloud database. Configure your database URL and auth token via environment variables.

### Initialization
The database schema is automatically initialized when the backend server starts for the first time.

### Data Synchronization
The application populates its database by scraping the Try Tag Rugby website.

#### Automatic Sync
The backend is designed to handle synchronization via internal triggers and API endpoints.

#### Manual Sync (via API)
You can trigger a full data synchronization by sending a POST request to the admin endpoint (no authentication currently implemented for development):

```bash
# Trigger a full sync of all regions, leagues, and current standings
curl -X POST http://localhost:3000/api/v1/admin/sync/full
```

You can check the status of the synchronization:

```bash
# Get the status of the last or current sync
curl http://localhost:3000/api/v1/admin/sync/status
```

#### Scheduled Sync (GitHub Actions)
A GitHub Actions workflow (`.github/workflows/sync-cron.yml`) runs every 6 hours to automatically sync data. This requires setting the `BACKEND_URL` secret in your GitHub repository settings pointing to your deployed backend.

#### Team Profiles
Detailed team statistics and position history are fetched on-demand when a specific team profile is viewed.

## Development Scripts

From the root directory, you can run:

### Running the App
- `npm run dev`: Starts the development servers for all packages (shared, backend, frontend) in parallel.
- `npm run dev:backend`: Starts only the backend server with watch mode.
- `npm run dev:frontend`: Starts only the frontend Vite development server.

### Building
- `npm run build`: Builds all packages. **Note:** `npm run build:shared` must be run before other packages if changes were made to the shared library.
- `npm run build:shared`: Builds the shared types and schemas using `tsup`.
- `npm run build:backend`: Compiles the backend TypeScript to JavaScript.
- `npm run build:frontend`: Compiles and bundles the frontend.

### Linting & Formatting
- `npm run lint`: Checks all packages for linting errors using ESLint.
- `npm run lint:fix`: Automatically fixes fixable linting errors.
- `npm run format`: Formats all code using Prettier.
- `npm run typecheck`: Runs TypeScript type checking across all workspaces.

### Maintenance
- `npm run clean`: Removes `dist` folders and `node_modules`.

## Backend Tools

The backend includes a utility for debugging statistics:
- `npx tsx packages/backend/src/debug-stats.ts`: Runs the stats debug utility.

## Development

- **Frontend**: Runs on [http://localhost:5173](http://localhost:5173)
- **Backend API**: Runs on [http://localhost:3000](http://localhost:3000)

## Deployment

The application is deployed using:
- **Backend**: Render.com (Docker)
- **Frontend**: Vercel
- **Database**: Turso (libSQL)

Key environment variables for production:
- `NODE_ENV`: Set to `production`
- `PORT`: The port for the server
- `TURSO_DATABASE_URL`: Your Turso database URL
- `TURSO_AUTH_TOKEN`: Your Turso auth token
- `CRON_SECRET`: Secret for securing sync endpoints
- `VITE_API_URL`: Backend API URL (for frontend build)

## License

MIT
