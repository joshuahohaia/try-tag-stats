# Try Tag Stats

A full-stack application for tracking Try Tag Rugby leagues, teams, and player statistics.

## Project Structure

This is a monorepo managed with npm workspaces:

- `packages/frontend`: React application built with Vite, Mantine UI, and TanStack Router.
- `packages/backend`: Node.js Express server with Drizzle ORM (SQLite).
- `packages/shared`: Shared TypeScript types and Zod schemas used by both frontend and backend.

## Features

- **Leagues & Divisions**: Browse leagues and filter by region.
- **Standings**: Real-time division standings including points, wins, losses, and point difference.
- **Fixtures & Results**: Track upcoming matches and recent results.
- **Team Profiles**: Detailed team statistics, position history charts, and player awards.
- **Favorites**: Star Your favourite Teams for quick access to their fixtures and standings on the home page.
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

The project uses SQLite with `better-sqlite3`. The database file location is configured in the backend environment variables (defaults to `packages/backend/data/trytag.db`).

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

#### Team Profiles
Detailed team statistics and position history are fetched on-demand when a specific team profile is viewed and then cached in the database.

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

## License

MIT
