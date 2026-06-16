# retrieval_agent.py
import os
import re
from typing import List, Dict, Any

# PDF extraction
import pymupdf

# ✅ FIXED: correct import for text splitter
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Embeddings and vector database
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.utils import embedding_functions

# ============================================================
# 1. CONFIGURATION
# ============================================================

POLICIES_FOLDER = "data/policies"
CHROMA_DB_PATH = "data/chroma_db"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# ============================================================
# 2. EXTRACT TEXT FROM PDFs
# ============================================================

def extract_text_from_pdf(pdf_path: str) -> str:
    """Open a PDF file and return all text as one string."""
    doc = pymupdf.open(pdf_path)
    full_text = ""
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        full_text += page.get_text()
    doc.close()
    return full_text

def load_all_policies() -> List[Dict[str, Any]]:
    """Loop through all PDFs and extract their text."""
    all_docs = []
    for filename in os.listdir(POLICIES_FOLDER):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(POLICIES_FOLDER, filename)
            print(f"📄 Reading: {filename}")
            text = extract_text_from_pdf(pdf_path)
            if text.strip():
                all_docs.append({
                    "filename": filename,
                    "text": text
                })
            else:
                print(f"   Warning: {filename} has no extractable text.")
    print(f"\n✅ Loaded {len(all_docs)} policy documents.\n")
    return all_docs

# ============================================================
# 3. CHUNKING (Split text into smaller pieces)
# ============================================================

def chunk_documents(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Split each document's text into overlapping chunks."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""],
        length_function=len
    )
    
    chunked_docs = []
    
    for doc in documents:
        filename = doc["filename"]
        text = doc["text"]
        
        chunks = text_splitter.split_text(text)
        
        for idx, chunk in enumerate(chunks):
            # Try to extract section numbers for citations
            section_match = re.search(r"(?:Section|section)\s+([\d\.]+)|(?:^|\n)(\d+\.\d+)(?:\s|$)", chunk)
            section_number = section_match.group(1) or section_match.group(2) if section_match else "Unknown"
            
            chunked_docs.append({
                "filename": filename,
                "chunk_index": idx,
                "section": section_number,
                "text": chunk
            })
    
    print(f"✂️  Created {len(chunked_docs)} chunks from {len(documents)} documents.\n")
    return chunked_docs

# ============================================================
# 4. CREATE VECTOR STORE (Embeddings + ChromaDB)
# ============================================================

def create_vector_store(chunks: List[Dict[str, Any]]):
    """Convert chunks to embeddings and store in ChromaDB."""
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    
    # Delete existing collection if it exists
    try:
        client.delete_collection("policy_chunks")
        print("🗑️  Removed existing collection 'policy_chunks'")
    except:
        pass
    
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    
    collection = client.create_collection(
        name="policy_chunks",
        embedding_function=embedding_fn
    )
    
    ids = []
    texts = []
    metadatas = []
    
    for i, chunk in enumerate(chunks):
        unique_id = f"{chunk['filename']}_chunk_{chunk['chunk_index']}"
        ids.append(unique_id)
        texts.append(chunk["text"])
        metadatas.append({
            "filename": chunk["filename"],
            "section": chunk["section"],
            "chunk_index": chunk["chunk_index"]
        })
    
    collection.add(ids=ids, documents=texts, metadatas=metadatas)
    
    print(f"💾 Stored {len(ids)} chunks in ChromaDB at '{CHROMA_DB_PATH}'\n")
    return collection

# ============================================================
# 5. RETRIEVAL FUNCTION (Main function you'll use)
# ============================================================

def retrieve_policy(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Return top_k most relevant policy chunks for the query."""
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = client.get_collection("policy_chunks")
    
    results = collection.query(
        query_texts=[query],
        n_results=top_k
    )
    
    retrieved = []
    if results['ids'] and results['ids'][0]:
        for i in range(len(results['ids'][0])):
            retrieved.append({
                "text": results['documents'][0][i],
                "filename": results['metadatas'][0][i]['filename'],
                "section": results['metadatas'][0][i]['section'],
                "score": results['distances'][0][i] if results.get('distances') else None
            })
    
    return retrieved

# ============================================================
# 6. MAIN EXECUTION
# ============================================================

def build_pipeline():
    """Run the full pipeline: load PDFs → chunk → embed → store."""
    print("=" * 60)
    print("📚 BUILDING DOCUMENT RETRIEVAL PIPELINE")
    print("=" * 60)
    
    print("\n[1/4] Loading PDFs...")
    documents = load_all_policies()
    
    print("[2/4] Splitting into chunks...")
    chunks = chunk_documents(documents)
    
    print("[3/4] Creating vector store (this may take 1-2 minutes)...")
    create_vector_store(chunks)
    
    print("[4/4] Testing retrieval with a sample query...")
    test_query = "Can I work from another country?"
    results = retrieve_policy(test_query, top_k=3)
    
    print(f"\n🔍 Test query: '{test_query}'")
    print("Top results:")
    for i, res in enumerate(results, 1):
        print(f"\n  [{i}] From {res['filename']} (Section {res['section']})")
        print(f"      Text: {res['text'][:150]}...")
    
    print("\n✅ Pipeline built successfully!")
    print("You can now use retrieve_policy('your question') to get relevant policy chunks.\n")

if __name__ == "__main__":
    build_pipeline()