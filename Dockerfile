# Use official Python slim image
FROM python:3.9-slim

# 1️⃣ Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libpoppler-cpp-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# 2️⃣ Set workdir
WORKDIR /app

# 3️⃣ Copy requirements first to leverage Docker cache
COPY requirements.txt .

# 4️⃣ Install Python dependencies with increased timeout
# First install typing-extensions explicitly with correct name
RUN pip install --no-cache-dir --default-timeout=100 \
    typing-extensions==4.12.2 && \
    pip install --no-cache-dir --default-timeout=100 \
    torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# 5️⃣ Pre-download models
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" && \
    python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# 6️⃣ Copy application code
COPY . .

# 7️⃣ Create data directories
RUN mkdir -p /app/data/uploads \
    /app/data/processed \
    /app/data/embeddings \
    /app/data/cache

# 8️⃣ Set environment variables
ENV PYTHONPATH=/app
EXPOSE 8080

# 9️⃣ Run the application
CMD ["python", "-m", "backend.main"]