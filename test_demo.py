# test_demo.py

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
EMAIL = "employee@corp.com"
PASSWORD = "employee123"

# Demo queries – grouped by expected outcome
DEMO_QUERIES = [
    {
        "query": "Can I work from another country for a week?",
        "expected_risk": "Low",
        "expected_status": "Approved",
        "expect_escalation": False,
        "description": "Low risk – remote work policy permits with notice"
    },
    {
        "query": "Can I share customer data with a vendor without approval?",
        "expected_risk": "High",
        "expected_status": "Not Recommended",
        "expect_escalation": True,
        "description": "High risk – policy violation, should create ticket"
    },
    {
        "query": "What is my in-hand salary after deductions?",
        "expected_risk": "Low",
        "expected_status": "Approved",
        "expect_escalation": False,
        "description": "Informational, no risk"
    },
    {
        "query": "Is my lunch expense of $30 with a client reimbursable?",
        "expected_risk": "Low",  # or Medium? Let's see what system returns
        "expected_status": "Restricted",  # likely restricted due to limit
        "expect_escalation": False,
        "description": "Expense near limit – may be restricted"
    },
    {
        "query": "Can I use my personal laptop to check work emails?",
        "expected_risk": "Medium",
        "expected_status": "Restricted",
        "expect_escalation": False,
        "description": "Personal device usage – likely restricted"
    },
    {
        "query": "I lost my company laptop. What should I do?",
        "expected_risk": "Medium",
        "expected_status": "Restricted",
        "expect_escalation": True,  # maybe escalation because it's an incident
        "description": "Lost device – needs immediate action, likely ticket"
    },
    {
        "query": "Can I claim travel expenses for a hotel that costs $250 in New York?",
        "expected_risk": "Low",
        "expected_status": "Restricted",  # might be allowed with approval
        "expect_escalation": False,
        "description": "High-cost hotel – may be restricted"
    },
    {
        "query": "What is the code of conduct regarding gifts from vendors?",
        "expected_risk": "Low",
        "expected_status": "Approved",
        "expect_escalation": False,
        "description": "Informational"
    }
]

def get_token(email, password):
    """Login and get JWT token."""
    url = f"{BASE_URL}/token"
    data = {
        "username": email,
        "password": password
    }
    # OAuth2 expects form data
    response = requests.post(url, data=data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return None
    token_data = response.json()
    return token_data["access_token"]

def run_demo_query(token, query_data):
    """Send a query to /query endpoint and print results."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {"query": query_data["query"]}
    
    try:
        response = requests.post(f"{BASE_URL}/query", json=payload, headers=headers)
        if response.status_code != 200:
            print(f"❌ Query failed: {response.text}")
            return None
        return response.json()
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def print_query_result(query_data, result):
    """Pretty print the result with expected vs actual."""
    print("\n" + "="*80)
    print(f"🔍 Query: {query_data['query']}")
    print(f"   Description: {query_data['description']}")
    print("-"*80)
    
    if not result:
        print("❌ No result returned")
        return
    
    # Extract fields
    decision = result.get("decision", {})
    risk = decision.get("risk_level", "Unknown")
    status = decision.get("compliance_status", "Unknown")
    reason = decision.get("reason", "No reason")
    explanation = result.get("explanation", "No explanation")
    citations = result.get("citations", [])
    escalation = result.get("needs_escalation", False)
    ticket = result.get("ticket")
    
    print(f"📊 Decision:")
    print(f"   Risk Level: {risk}")
    print(f"   Compliance Status: {status}")
    print(f"   Reason: {reason}")
    print(f"   Explanation: {explanation}")
    if citations:
        print("   Citations:")
        for c in citations:
            print(f"     - {c.get('filename')} Section {c.get('section')}")
    print(f"   Escalation needed: {escalation}")
    if ticket:
        print(f"   Ticket: {ticket.get('ticket_id')} – {ticket.get('status')}")
    
    # Validate against expected
    print("-"*40)
    print("✅ Expected vs Actual:")
    expected_risk = query_data.get("expected_risk")
    expected_status = query_data.get("expected_status")
    expected_escalation = query_data.get("expect_escalation")
    
    risk_ok = risk == expected_risk
    status_ok = status == expected_status
    escalation_ok = escalation == expected_escalation
    
    print(f"   Risk:    Expected {expected_risk}, Got {risk} {'✅' if risk_ok else '❌'}")
    print(f"   Status:  Expected {expected_status}, Got {status} {'✅' if status_ok else '❌'}")
    print(f"   Escalate:Expected {expected_escalation}, Got {escalation} {'✅' if escalation_ok else '❌'}")
    print("="*80)

def main():
    print("🚀 Starting End-to-End Demo Test")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-"*80)
    
    # 1. Get token
    print("🔐 Logging in...")
    token = get_token(EMAIL, PASSWORD)
    if not token:
        print("❌ Cannot proceed without token.")
        return
    print("✅ Login successful, token obtained.")
    
    # 2. Run each query with a small delay to avoid rate limits
    for i, q in enumerate(DEMO_QUERIES, 1):
        print(f"\n[{i}/{len(DEMO_QUERIES)}] Running query...")
        result = run_demo_query(token, q)
        print_query_result(q, result)
        
        # Wait 15 seconds between queries to avoid Gemini rate limits
        if i < len(DEMO_QUERIES):
            print("⏳ Waiting 15 seconds to avoid rate limits...")
            time.sleep(15)
    
    print("\n✅ All demo queries executed.")
    print("💡 You can now review the results above.")

if __name__ == "__main__":
    main()