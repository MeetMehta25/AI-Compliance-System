# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for better caching)
COPY frontend/package*.json ./
RUN npm ci

# Copy the rest of the application
COPY frontend/ ./

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js production build
RUN npm run build

# Stage 2: Serve the Next.js application
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install production-only dependencies
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy built assets and configurations from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/app ./app

# Expose Next.js port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run the next server
CMD ["npx", "next", "start"]
