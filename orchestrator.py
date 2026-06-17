# orchestrator.py
# Chains retrieval → interpretation → risk → escalation → final response

from retrieval_agent import retrieve_policy
from policy_agent import interpret_policy
from risk_agent import assess_risk
from escalation_agent import log_query, create_ticket_if_needed

def process_query(query: str) -> dict:
    """
    Main entry point for the compliance assistant.
    Takes a natural language query, returns a complete decision JSON.
    """
    print(f"\n🚀 Processing query: {query}")

    # Step 1: Retrieve relevant policy chunks (optional, but can be included in final output)
    retrieved_chunks = retrieve_policy(query, top_k=3)
    
    # Step 2: Get policy interpretation (explanation + citations)
    interpretation = interpret_policy(query)
    
    # Step 3: Assess risk
    risk_result = assess_risk(query)
    
    # Step 4: Log the query (always)
    log_query(query, risk_result, interpretation)
    
    # Step 5: Create ticket if escalation is needed
    ticket_info = create_ticket_if_needed(query, risk_result)
    
    # Step 6: Build final response JSON
    final_response = {
        "query": query,
        "decision": {
            "compliance_status": risk_result.get("compliance_status", "Unknown"),
            "risk_level": risk_result.get("risk_level", "Unknown"),
            "reason": risk_result.get("reason", "No reason provided")
        },
        "explanation": interpretation.get("explanation", "No explanation available"),
        "citations": interpretation.get("citations", []),
        "confidence": interpretation.get("confidence", None),
        "is_ambiguous": interpretation.get("is_ambiguous", False),
        "needs_escalation": risk_result.get("needs_escalation", False),
        "ticket": ticket_info,  # None or {"ticket_id": "...", "status": "..."}
        "retrieved_chunks": [  # Optional: for debugging/demo transparency
            {
                "filename": c["filename"],
                "section": c["section"],
                "text_preview": c["text"][:200] + "..."
            }
            for c in retrieved_chunks
        ]
    }
    
    return final_response

# Simple test when run directly
if __name__ == "__main__":
    import time
    queries = [
        "Can I work from another country for a week?",
        "Can I share customer data with a vendor without approval?",
        "What is my in-hand salary after deductions?"
    ]
    
    for q in queries:
        print("\n" + "="*60)
        result = process_query(q)
        print("\n📋 FINAL RESPONSE:")
        print(f"Compliance Status: {result['decision']['compliance_status']}")
        print(f"Risk Level: {result['decision']['risk_level']}")
        print(f"Reason: {result['decision']['reason']}")
        print(f"Explanation: {result['explanation']}")
        print(f"Citations: {result['citations']}")
        print(f"Escalation needed: {result['needs_escalation']}")
        if result['ticket']:
            print(f"Ticket created: {result['ticket']['ticket_id']} ({result['ticket']['status']})")
        time.sleep(15)   # Wait 15 seconds between queries to stay under rate limit