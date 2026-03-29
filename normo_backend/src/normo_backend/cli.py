"""
Command-line interface for managing the Normo backend.
"""

import argparse
import os
import sys
from pathlib import Path

from normo_backend.services.vector_store import get_vector_store
from normo_backend.utils.pdf_processor import get_available_pdfs


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Normo Backend CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Vector store commands
    vs_parser = subparsers.add_parser("vectorstore", help="Vector store management")
    vs_subparsers = vs_parser.add_subparsers(dest="vs_command")
    
    # Status command
    vs_subparsers.add_parser("status", help="Show vector store status")
    
    # Embed command
    embed_parser = vs_subparsers.add_parser("embed", help="Embed PDFs")
    embed_parser.add_argument("--all", action="store_true", help="Embed all available PDFs")
    embed_parser.add_argument("--force", action="store_true", help="Force re-embedding")
    embed_parser.add_argument("--max-size", type=int, default=0, help="Skip PDFs larger than N MB (0=no limit)")
    embed_parser.add_argument("pdfs", nargs="*", help="Specific PDFs to embed")
    
    # Reset command
    vs_subparsers.add_parser("reset", help="Reset vector store (delete all embeddings)")
    
    # List command
    vs_subparsers.add_parser("list", help="List available PDFs")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == "vectorstore":
        handle_vectorstore_command(args)
    else:
        print(f"Unknown command: {args.command}")
        sys.exit(1)


def handle_vectorstore_command(args):
    """Handle vector store commands."""
    if not args.vs_command:
        print("Vector store command required. Use --help for options.")
        return
    
    vector_store = get_vector_store()
    
    if args.vs_command == "status":
        print("📊 Vector Store Status")
        print("=" * 40)
        
        stats = vector_store.get_collection_stats()
        print(f"Total chunks: {stats['total_chunks']}")
        print(f"Embedded PDFs: {stats['embedded_pdfs']}")
        
        if stats['pdf_list']:
            print("\nEmbedded PDFs:")
            for pdf in stats['pdf_list']:
                print(f"  ✅ {pdf}")
        
        available_pdfs = get_available_pdfs("arch_pdfs")
        embedded_pdfs = set(stats['pdf_list'])
        missing_pdfs = set(available_pdfs) - embedded_pdfs
        
        if missing_pdfs:
            print(f"\nAvailable but not embedded ({len(missing_pdfs)}):")
            for pdf in missing_pdfs:
                print(f"  ⏳ {pdf}")
    
    elif args.vs_command == "embed":
        if args.all:
            available_pdfs = get_available_pdfs("arch_pdfs")
            if args.max_size > 0:
                max_bytes = args.max_size * 1024 * 1024
                filtered = []
                skipped = []
                for pdf in available_pdfs:
                    pdf_path = Path("arch_pdfs") / pdf
                    try:
                        size = pdf_path.stat().st_size
                    except OSError:
                        size = 0
                    if size <= max_bytes:
                        filtered.append(pdf)
                    else:
                        skipped.append((pdf, size / (1024 * 1024)))
                if skipped:
                    print(f"⏭️  Skipping {len(skipped)} PDFs larger than {args.max_size} MB:")
                    for name, sz in skipped:
                        print(f"   {sz:.1f} MB - {Path(name).name}")
                available_pdfs = filtered
            available_pdfs.sort(key=lambda p: (Path("arch_pdfs") / p).stat().st_size
                                if (Path("arch_pdfs") / p).exists() else 0)
            if args.force:
                vector_store.reset_vector_store()
            result = vector_store.ensure_pdfs_embedded(available_pdfs)
            if result:
                print("✅ Embedding completed")
            else:
                print("ℹ️  All PDFs already embedded")
        elif args.pdfs:
            if args.force:
                # For specific PDFs, we would need to implement selective reset
                print("⚠️  Force flag not supported for specific PDFs yet")
            result = vector_store.ensure_pdfs_embedded(args.pdfs)
            if result:
                print("✅ Embedding completed")
            else:
                print("ℹ️  Specified PDFs already embedded")
        else:
            print("❌ No PDFs specified. Use --all or provide specific PDF names.")
    
    elif args.vs_command == "reset":
        confirmation = input("⚠️  This will delete all embeddings. Are you sure? (y/N): ")
        if confirmation.lower() in ['y', 'yes']:
            vector_store.reset_vector_store()
            print("✅ Vector store reset completed")
        else:
            print("❌ Reset cancelled")
    
    elif args.vs_command == "list":
        available_pdfs = get_available_pdfs("arch_pdfs")
        stats = vector_store.get_collection_stats()
        embedded_pdfs = set(stats['pdf_list'])
        
        print("📚 Available PDFs")
        print("=" * 40)
        
        for pdf in available_pdfs:
            status = "✅ Embedded" if pdf in embedded_pdfs else "⏳ Not embedded"
            print(f"{status:<15} {pdf}")
        
        print(f"\nTotal: {len(available_pdfs)} PDFs, {len(embedded_pdfs)} embedded")


if __name__ == "__main__":
    main()
