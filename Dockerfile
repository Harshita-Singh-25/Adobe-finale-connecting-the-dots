# ============================
# Stage 1: Frontend Build
# ============================
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Install dependencies - use package-lock.json for deterministic builds
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ============================
# Stage 2: Backend with Python
# ============================
FROM python:3.11 as backend

# Install system dependencies for ML + PyMuPDF
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    cmake \
    git \
    curl \
    pkg-config \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean  # Clean up apt cache

WORKDIR /app

# Copy Python requirements and install dependencies with cache dir
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True)"

# Copy backend source
COPY backend/ backend/
COPY data/ data/

# Copy built frontend into backend static
COPY --from=frontend-build /app/frontend/dist /app/backend/static

# Create runtime directories with proper permissions
RUN mkdir -p data/uploads data/processed data/embeddings data/cache \
    && chmod -R 755 data/  # Add proper permissions

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1  
# Better logging
EXPOSE 8080

# Healthcheck with correct endpoint
HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:8080/api/health/health || exit 1

# Start backend with better process management
CMD ["python", "-m", "backend.main"]