"""
Quick script to process one PDF with images using docling
"""
from src.normo_backend.services.vector_store import get_vector_store

# Initialize vector store
vector_store = get_vector_store()

# Process just one PDF that likely has diagrams
# This one has building diagrams and requirements
pdf_to_process = ["03_OIB Richtlinien/2023/3_AT_0_0_OIB-RL_OIB-Richtlinie 2 Brandschutz_Ausgabe April 2023.pdf"]

print(f"🔬 Processing PDF with docling to extract images...")
print(f"   PDF: {pdf_to_process[0]}")
print(f"   This will take 2-3 minutes...")

vector_store.add_pdf_embeddings(pdf_to_process)

print("✅ Done! Try asking about fire protection requirements now!")

