#!/bin/bash
set -e

echo "=== Normo Backend Starting ==="

echo "Checking vector store status..."
CHUNK_COUNT=$(uv run python -c "
import sys, io
sys.stdout = io.StringIO()
from normo_backend.services.vector_store import get_vector_store
vs = get_vector_store()
stats = vs.get_collection_stats()
sys.stdout = sys.__stdout__
print(stats['total_chunks'])
" 2>/dev/null || echo "0")

CHUNK_COUNT=$(echo "$CHUNK_COUNT" | tail -1 | tr -d '[:space:]')
echo "Vector store has $CHUNK_COUNT chunks"

if [ "$CHUNK_COUNT" = "0" ] || [ -z "$CHUNK_COUNT" ]; then
    echo ""
    echo "Vector store is empty."

    if [ "${AUTO_EMBED:-false}" = "true" ]; then
        echo "AUTO_EMBED=true - running initial embedding..."
        echo "This will take a long time for all PDFs."
        echo ""

        uv run python -c "
from normo_backend.services.vector_store import get_vector_store
from normo_backend.utils.pdf_processor import get_available_pdfs

vs = get_vector_store()
vs.reset_vector_store()

pdfs = get_available_pdfs('arch_pdfs')
print(f'Found {len(pdfs)} PDFs to embed')

if pdfs:
    vs.ensure_pdfs_embedded(pdfs)
    stats = vs.get_collection_stats()
    print(f'Embedding complete: {stats[\"total_chunks\"]} chunks from {stats[\"embedded_pdfs\"]} PDFs')
"
        echo "=== Embedding complete ==="
    else
        echo "To embed PDFs, run:"
        echo "  docker exec normo-backend uv run normo-cli vectorstore embed --all"
        echo "Or set AUTO_EMBED=true in docker-compose.yml"
    fi
fi

echo ""
echo "Starting Uvicorn server..."
exec uv run uvicorn normo_backend.api.app:app --host 0.0.0.0 --port 8000
