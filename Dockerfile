# --- Stage 1: Builder ---
FROM node:lts-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for TypeScript)
COPY package*.json ./
# 'npm ci' is faster and more reliable than 'npm install' for builds
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:lts-alpine

WORKDIR /app

# Set environment to production (optimizes Express/Node)
ENV NODE_ENV=production

# Install ONLY production dependencies to keep image small
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from the Builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create data directory and set permissions for the 'node' user
# (Running as root is insecure; Alpine comes with a 'node' user)
RUN mkdir -p data && chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000

# Run node directly (saves memory vs running via npm)
CMD ["node", "dist/server.js"]