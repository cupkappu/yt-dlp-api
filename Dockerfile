# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    curl \
    && rm -rf /var/cache/apk/*

# Install yt-dlp using pip
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build the TypeScript code
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Change ownership of the app directory
RUN chown -R mcp:nodejs /app
USER mcp

# Expose port (if needed for future extensions)
# EXPOSE 3000

# Set the default command
CMD ["node", "dist/index.js"]

# Add labels for better container management
LABEL maintainer="yt-dlp-mcp-server"
LABEL description="Model Context Protocol server for yt-dlp video operations"
LABEL version="1.0.0"
