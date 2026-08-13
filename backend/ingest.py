import os
import hashlib
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone

# Project root folder
BASE_DIR = Path(__file__).resolve().parent.parent
DOCUMENTS_DIR = BASE_DIR / "documents"

# Load environment variables
load_dotenv(BASE_DIR / ".env")


def get_pinecone_index():
    """Retrieve initialized Pinecone index instance."""
    pinecone_api_key = os.getenv("PINECONE_API_KEY")
    if not pinecone_api_key:
        raise ValueError("PINECONE_API_KEY is missing from .env")
    
    index_name = os.getenv("PINECONE_INDEX_NAME", "enterprise-policy-index")
    pc = Pinecone(api_key=pinecone_api_key)
    return pc.Index(index_name)


def determine_policy_type(file_stem: str) -> str:
    """Classify policy document category based on file stem."""
    stem = file_stem.lower()
    if "leave" in stem:
        return "HR & Leave Policy"
    elif "travel" in stem:
        return "Travel & Expense Policy"
    elif "insurance" in stem or "medical" in stem or "health" in stem:
        return "Health & Insurance Policy"
    else:
        return "Enterprise Policy"


def load_documents():
    """
    Scans documents directory, chunks content (~800 characters),
    extracts metadata (title, policy_type, last_updated, doc_hash, chunk_id),
    and formats records for Pinecone Integrated Inference ingestion.
    """
    records = []
    files_processed = []

    for file_path in DOCUMENTS_DIR.glob("*.txt"):
        # Skip typo or draft files
        if file_path.name == "travel_polict.txt":
            continue

        files_processed.append(file_path.name)
        text = file_path.read_text(encoding="utf-8")

        # Metadata extraction
        mtime = file_path.stat().st_mtime
        last_updated = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        doc_hash = hashlib.md5(text.encode("utf-8")).hexdigest()[:8]
        policy_type = determine_policy_type(file_path.stem)
        title = file_path.stem.replace("_", " ").title()

        # Split into section/paragraph chunks
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

        current_chunk = []
        current_length = 0
        chunk_idx = 0

        for para in paragraphs:
            if current_length + len(para) > 800 and current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                chunk_id = f"{file_path.stem}-v1-{chunk_idx}"
                records.append({
                    "_id": chunk_id,
                    "text": chunk_text,
                    "source": file_path.name,
                    "title": title,
                    "policy_type": policy_type,
                    "chunk_id": chunk_id,
                    "version": f"1.0-{doc_hash}",
                    "last_updated": last_updated
                })
                chunk_idx += 1
                current_chunk = [para]
                current_length = len(para)
            else:
                current_chunk.append(para)
                current_length += len(para)

        if current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunk_id = f"{file_path.stem}-v1-{chunk_idx}"
            records.append({
                "_id": chunk_id,
                "text": chunk_text,
                "source": file_path.name,
                "title": title,
                "policy_type": policy_type,
                "chunk_id": chunk_id,
                "version": f"1.0-{doc_hash}",
                "last_updated": last_updated
            })

    return records, files_processed


def ingest_documents(namespace: str = "policies", clear_existing: bool = True):
    """
    Ingests document records into Pinecone Integrated Inference.
    Clears existing namespace records before upserting to prevent stale chunk accumulation.
    """
    index = get_pinecone_index()
    records, files_processed = load_documents()

    if not records:
        return {
            "status": "error",
            "message": "No document records found to ingest.",
            "processed_files": files_processed,
            "chunks_count": 0
        }

    # Clear existing namespace vectors to prevent stale chunk accumulation
    if clear_existing:
        try:
            index.delete(delete_all=True, namespace=namespace)
        except Exception as e:
            print(f"[Notice] Namespace clear skipped or empty: {e}")

    # Upsert new document records
    index.upsert_records(
        namespace=namespace,
        records=records
    )

    stats = index.describe_index_stats()
    return {
        "status": "success",
        "message": f"Successfully ingested {len(records)} chunks from {len(files_processed)} policy documents.",
        "processed_files": files_processed,
        "chunks_count": len(records),
        "index_stats": {
            "total_vector_count": getattr(stats, "total_vector_count", None),
            "dimension": getattr(stats, "dimension", None)
        }
    }


if __name__ == "__main__":
    print("Starting document ingestion with metadata versioning...")
    result = ingest_documents()
    print(result["message"])
    print("Files:", result["processed_files"])
    print("Stats:", result.get("index_stats"))