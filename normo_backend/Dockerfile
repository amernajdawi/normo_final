FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -o /app/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

RUN pip install uv

COPY pyproject.toml uv.lock* ./
COPY src/ ./src/

RUN uv sync --frozen --python 3.12

COPY arch_pdfs/ ./arch_pdfs/
COPY chroma_db_openai_v2/ ./chroma_db_openai_v2/
COPY rag_assets/ ./rag_assets/
COPY entrypoint.sh ./entrypoint.sh

RUN mkdir -p /app/chroma_db_openai_v2 /app/rag_assets /app/conversations \
    && chmod +x /app/entrypoint.sh

EXPOSE 8000

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

CMD ["/app/entrypoint.sh"]