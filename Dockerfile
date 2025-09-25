FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install minimal system dependencies (only curl for health check)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install yt-dlp from the reference directory
COPY reference/yt-dlp ./yt-dlp-source
RUN pip install --no-cache-dir ./yt-dlp-source

# Copy application code
COPY main.py .
COPY .env.example .env

# Create temporary directory
RUN mkdir -p /tmp/ytdlp_api

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
