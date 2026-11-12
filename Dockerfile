# Production Dockerfile for Business Management System on Railway
FROM node:22-slim

WORKDIR /app

# Install native compilation dependencies for SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Build production assets for frontend
RUN npm run build

# Create directories for persistent storage (Railway Volumes)
RUN mkdir -p /app/data /app/uploads

# Set default production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV UPLOADS_DIR=/app/uploads

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/v1/health || exit 1

# Start the full-stack server
CMD ["npm", "start"]
