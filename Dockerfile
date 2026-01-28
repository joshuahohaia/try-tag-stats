# Build stage
FROM node:20-alpine AS builder

# Cache bust argument - change value to force rebuild
ARG CACHE_BUST=2

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/

# Install dependencies and rollup platform binary for Alpine
# CACHE_BUST reference forces layer rebuild when ARG changes
RUN echo "Cache bust: $CACHE_BUST" && npm install && npm install @rollup/rollup-linux-x64-musl

# Copy source code
COPY . .

# Build shared package first (required for typecheck and tests)
RUN npm run build:shared

# Build all packages (skipping tests for faster deploy)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist

# Install production dependencies
RUN npm ci --omit=dev --workspace=packages/backend --workspace=packages/shared

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start the server
CMD ["node", "packages/backend/dist/index.js"]
