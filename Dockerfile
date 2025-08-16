# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libpoppler-cpp-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create data directories
RUN mkdir -p /app/data/uploads \
    /app/data/processed \
    /app/data/embeddings \
    /app/data/cache

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# Set environment variables
ENV PYTHONPATH=/app
#ENV ADOBE_EMBED_API_KEY=${ADOBE_EMBED_API_KEY}
#ENV GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json

EXPOSE 8080

CMD ["python", "-m", "backend.main"]