# policy_agent.py - using the new google.genai package

import os
import json
from google import genai
from retrieval_agent import retrieve_policy

# ============================================================
# 1. Configure Gemini API
# ============================================================

# Option A: Use environment variable (recommended)
# GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
# Option B: Hardcode for testing (remove before sharing)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")   # <-- Replace with your actual key

# Create client
client = genai.Client(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-2.5-flash"

# ============================================================
# 2. Interpretation Function
# ============================================================

def interpret_policy(query: str, top_k: int = 5) -> dict:
    """
    Interpret the user's query against retrieved policy chunks.
    Returns a dict with:
        - explanation (str)
        - citations (list of {filename, section})
    """
    # Step 1: Retrieve relevant policy chunks
    retrieved_chunks = retrieve_policy(query, top_k=top_k)
    
    if not retrieved_chunks:
        return {
            "explanation": "I couldn't find any relevant policy sections. Please refine your question.",
            "citations": []
        }
    
    # Step 2: Build context from chunks
    context = ""
    for i, chunk in enumerate(retrieved_chunks, 1):
        context += f"\n--- Source {i}: {chunk['filename']}, Section {chunk['section']} ---\n"
        context += chunk['text'] + "\n"
    
    # Step 3: Create prompt
    prompt = f"""
You are a helpful policy assistant for a company. Your job is to answer employee questions based ONLY on the provided policy excerpts.

User question: "{query}"

Here are the relevant policy excerpts (each marked with source file and section number):
{context}

Instructions:
1. Answer the user's question in plain, simple English.
2. Always cite the source(s) you used, like: (Data Protection Policy, Section 4.3)
3. If the answer is not clearly stated in the excerpts, say "The policy does not explicitly address this, but based on similar sections..." or ask for clarification.
4. Keep your answer concise (2-4 sentences).

Now provide your answer in the following JSON format:
{{
  "explanation": "your answer here",
  "citations": [
    {{"filename": "example.pdf", "section": "3.2"}},
    ...
  ]
}}
"""
    
    # Step 4: Call Gemini API using the new client
    response = call_with_retry(client, MODEL_NAME, prompt)
    
    # Step 5: Parse the response
    response_text = response.text.strip()
    
    # Remove markdown code blocks if present
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    
    try:
        result = json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback: return plain text as explanation
        result = {
            "explanation": response_text,
            "citations": []
        }
    
    return result

import time

def call_with_retry(client, model, prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            return response
        except Exception as e:
            # Check if it's a rate limit error (429)
            if "429" in str(e) and attempt < max_retries - 1:
                wait = (2 ** attempt) + 1
                print(f"Rate limited. Retrying in {wait} seconds...")
                time.sleep(wait)
            else:
                raise
    raise Exception("Max retries exceeded")
# ============================================================
# 3. Test (optional)
# ============================================================

if __name__ == "__main__":
    test_query = "Can I work from another country for a week?"
    print(f"Query: {test_query}\n")
    result = interpret_policy(test_query)
    print("Explanation:", result["explanation"])
    print("\nCitations:", result["citations"])