# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create necessary directories
RUN mkdir -p uploads/videos chroma_db

# Download YOLO model if not present
RUN if [ ! -f "yolov8n.pt" ]; then \
        python download_yolo_model.py || echo "YOLO model will be downloaded on first use"; \
    fi

# Expose port
EXPOSE 5001

# Run the application
CMD ["python", "app.py"]
