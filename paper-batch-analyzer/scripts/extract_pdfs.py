# -*- coding: utf-8 -*-
"""Extract text from PDF files in a folder and save as JSON.

Usage:
    python extract_pdfs.py <pdf_folder> <output_json> [--max-chars 8000] [--max-pages 15]

Dependency: pip install pdfplumber
"""

import os
import sys
import json
import argparse

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)


def extract_pdf_text(pdf_path, max_chars=8000, max_pages=15):
    """Extract text from a single PDF file."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages[:max_pages]:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                if len(text) > max_chars:
                    break
            return text.strip()
    except Exception as e:
        return f"[Error reading PDF: {str(e)}]"


def get_title_from_filename(filename):
    """Extract paper title from filename (remove .pdf extension)."""
    return filename.replace('.pdf', '').strip()


def main():
    parser = argparse.ArgumentParser(description="Extract text from PDF files")
    parser.add_argument("pdf_folder", help="Folder containing PDF files")
    parser.add_argument("output_json", help="Output JSON file path")
    parser.add_argument("--max-chars", type=int, default=8000, help="Max characters per paper")
    parser.add_argument("--max-pages", type=int, default=15, help="Max pages to read per paper")
    parser.add_argument("--batch-size", type=int, default=0, help="Split into batches of N files (0=no split)")
    args = parser.parse_args()

    if not os.path.isdir(args.pdf_folder):
        print(f"ERROR: Folder not found: {args.pdf_folder}")
        sys.exit(1)

    pdf_files = sorted([f for f in os.listdir(args.pdf_folder) if f.lower().endswith('.pdf')])

    if not pdf_files:
        print(f"ERROR: No PDF files found in {args.pdf_folder}")
        sys.exit(1)

    print(f"Found {len(pdf_files)} PDF files")

    # If batch mode, split into multiple output files
    if args.batch_size > 0:
        batches = [pdf_files[i:i + args.batch_size] for i in range(0, len(pdf_files), args.batch_size)]
        for batch_idx, batch in enumerate(batches, 1):
            results = {}
            for i, pdf_file in enumerate(batch, 1):
                pdf_path = os.path.join(args.pdf_folder, pdf_file)
                print(f"  Batch {batch_idx} [{i}/{len(batch)}] {pdf_file}")
                text = extract_pdf_text(pdf_path, args.max_chars, args.max_pages)
                results[pdf_file] = {
                    'title': get_title_from_filename(pdf_file),
                    'text': text[:args.max_chars]
                }

            base, ext = os.path.splitext(args.output_json)
            output_file = f"{base}_batch{batch_idx}{ext}"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"  Batch {batch_idx} saved: {output_file} ({len(results)} papers)")
    else:
        results = {}
        for i, pdf_file in enumerate(pdf_files, 1):
            pdf_path = os.path.join(args.pdf_folder, pdf_file)
            print(f"  [{i}/{len(pdf_files)}] {pdf_file}")
            text = extract_pdf_text(pdf_path, args.max_chars, args.max_pages)
            results[pdf_file] = {
                'title': get_title_from_filename(pdf_file),
                'text': text[:args.max_chars]
            }

        with open(args.output_json, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\nDone! {len(results)} papers saved to: {args.output_json}")


if __name__ == '__main__':
    main()
