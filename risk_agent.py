# risk_agent.py

import os
import json
from google import genai
from retrieval_agent import retrieve_policy
from policy_agent import interpret_policy  # reuse your interpretation function

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
# Configuration
client = genai.Client(api_key=GEMINI_API_KEY)  # Replace with your actual key
MODEL_NAME = "gemini-2.5-flash"            # or gemini-2.5-flash

def assess_risk(query: str) -> dict:
    """
    Evaluate the compliance risk of a user's proposed action.
    Returns JSON with:
        - risk_level (Low/Medium/High)
        - compliance_status (Approved/Restricted/Not Recommended)
        - reason (short sentence)
        - needs_escalation (bool)
    """
    # Step 1: Get policy interpretation (explanation + citations)
    interpretation = interpret_policy(query)
    
    # Step 2: Retrieve raw policy chunks (optional, but provides more context)
    chunks = retrieve_policy(query, top_k=3)
    context = ""
    for i, chunk in enumerate(chunks, 1):
        context += f"\n--- Source {i}: {chunk['filename']}, Section {chunk['section']} ---\n"
        context += chunk['text'][:300] + "\n"  # limit length
    
    # Step 3: Build the risk assessment prompt
    prompt = f"""
You are a compliance risk assessment agent. Your job is to evaluate the risk of a proposed action based on company policies.

User question: "{query}"

Policy interpretation (from earlier agent):
{interpretation.get('explanation', 'No explanation available')}

Relevant policy excerpts:
{context}

Instructions:
- Risk Level: Low (minor issue, no serious consequence), Medium (policy violation with moderate impact), High (serious violation, potential data breach, legal issue, or ethics breach)
- Compliance Status: Approved (explicitly allowed), Restricted (allowed only under conditions), Not Recommended (discouraged or prohibited)
- Reason: One short sentence explaining the risk and compliance status.
- needs_escalation: true if Risk Level is High, or if the query is ambiguous and requires human review. Otherwise false.

Return ONLY valid JSON in this exact format:
{{
  "risk_level": "Low",
  "compliance_status": "Approved",
  "reason": "Brief explanation",
  "needs_escalation": false
}}
"""
    
    # Step 4: Call Gemini
    response = call_with_retry(client, MODEL_NAME, prompt)
    
    response_text = response.text.strip()
    # Clean JSON if wrapped in markdown
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    
    try:
        result = json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback
        result = {
            "risk_level": "Medium",
            "compliance_status": "Restricted",
            "reason": "Unable to parse risk assessment. Manual review required.",
            "needs_escalation": True
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

# Test the agent
if __name__ == "__main__":
    test_queries = [
        "Can I work from another country for a week?",
        "Can I share customer data with a vendor without approval?",
        "What is my in-hand salary after deductions?"
    ]
    
    for q in test_queries:
        print(f"\n--- Query: {q} ---")
        risk = assess_risk(q)
        print(f"Risk Level: {risk['risk_level']}")
        print(f"Compliance Status: {risk['compliance_status']}")
        print(f"Reason: {risk['reason']}")
        print(f"Escalate: {risk['needs_escalation']}")

        