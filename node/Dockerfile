# Stage 1: Build dependencies and app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first → better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# (Optional: if you use TypeScript or build step → add here)
# RUN npm run build   # if you have a build script

# Stage 2: Lightweight production image
FROM node:20-alpine

# Create non-root user for security
RUN addgroup -g 1001 nodejs && \
    adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Copy only production artifacts from builder
COPY --from=builder /app /app

# Change ownership
RUN chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose port (your PORT env var, default 5000)
EXPOSE 5000

# Start the app
CMD ["node", "server.js"]