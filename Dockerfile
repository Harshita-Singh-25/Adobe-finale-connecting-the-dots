# ============================
# Stage 1: Frontend Build
# ============================
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ============================
# Stage 2: Backend with Python
# ============================
FROM python:3.11 as backend   
# use full image, not slim

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
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install dependencies
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

# Create runtime directories
RUN mkdir -p data/uploads data/processed data/embeddings data/cache

# Env + port
ENV PYTHONPATH=/app
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:8080/api/health/health || exit 1

# Start backend
CMD ["python", "-m", "backend.main"]
