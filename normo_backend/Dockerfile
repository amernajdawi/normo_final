# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download AWS DocumentDB certificate bundle for TLS connections
RUN curl -o /app/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Install UV package manager
RUN pip install uv

# Copy dependency files and source code
COPY pyproject.toml uv.lock* ./
COPY src/ ./src/
COPY arch_pdfs/ ./arch_pdfs/
COPY vector_store/ ./vector_store/

# Install dependencies using UV with Python 3.12
RUN uv sync --frozen --python 3.12

# Create necessary directories
RUN mkdir -p /app/vector_store

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["uv", "run", "uvicorn", "normo_backend.api.app:app", "--host", "0.0.0.0", "--port", "8000"]