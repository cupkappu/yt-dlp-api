# Use Ubuntu base for better compatibility with Whisper
FROM node:18 AS production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp and OpenAI Whisper using pip
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp openai-whisper

# Verify installations
RUN yt-dlp --version && python3 -c "import whisper; print('Whisper installed successfully')"

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
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs -m mcp

# Change ownership of the app directory
RUN chown -R mcp:nodejs /app

# Pre-download Whisper models to avoid permission issues
RUN python3 -c "import whisper; whisper.load_model('tiny'); whisper.load_model('base')"
USER mcp

# Expose port (if needed for future extensions)
# EXPOSE 3000

# Set the default command
CMD ["node", "dist/index.js"]

# Add labels for better container management
LABEL maintainer="yt-dlp-mcp-server"
LABEL description="Model Context Protocol server for yt-dlp video operations"
LABEL version="1.0.0"
