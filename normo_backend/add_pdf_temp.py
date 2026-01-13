#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Temporary script to add the explanatory notes PDF to the database."""

import sys
import os

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from normo_backend.services.vector_store import get_vector_store

# Add the explanatory notes PDF
pdf_path = "01_Data base documents/03_OIB Richtlinien/2023/3_AT_0_0_OIB_Erläuternde Bemerkungen zu OIB-Richtlinie 3 Hygiene, Gesundheit und Umweltschutz Ausgabe Mai 2023_OIB-330.3-012_23.pdf"

print(f"Adding PDF: {pdf_path}")
vs = get_vector_store()
result = vs.add_pdf_embeddings([pdf_path])
print(f"Successfully added {result} chunks!")

