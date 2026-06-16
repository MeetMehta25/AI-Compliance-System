# escalation_agent.py

import sqlite3
import os
from datetime import datetime

DB_PATH = "data/compliance.db"

def init_database():
    """
    Create SQLite tables if they don't exist:
    - audit_log: records every query (for compliance tracking)
    - tickets: only for escalated queries
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Audit log table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            query TEXT,
            risk_level TEXT,
            compliance_status TEXT,
            explanation TEXT,
            citations TEXT
        )
    ''')
    
    # Tickets table (for escalated cases)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tickets (
            ticket_id TEXT PRIMARY KEY,
            timestamp TEXT,
            query TEXT,
            risk_level TEXT,
            reason TEXT,
            status TEXT DEFAULT 'Pending Review'
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized at", DB_PATH)

def generate_ticket_id() -> str:
    """Generate a unique ticket ID like COMP-1001"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM tickets")
    count = cursor.fetchone()[0]
    conn.close()
    # Start from 1001
    return f"COMP-{1001 + count}"

def log_query(query: str, risk_result: dict, interpretation: dict):
    """
    Log every user query to audit_log table.
    Called regardless of escalation.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Convert citations list to a string for storage
    citations_str = str(interpretation.get('citations', []))
    
    cursor.execute('''
        INSERT INTO audit_log (timestamp, query, risk_level, compliance_status, explanation, citations)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        datetime.now().isoformat(),
        query,
        risk_result.get('risk_level', 'Unknown'),
        risk_result.get('compliance_status', 'Unknown'),
        interpretation.get('explanation', ''),
        citations_str
    ))
    
    conn.commit()
    conn.close()
    print(f"📝 Logged query: {query[:50]}...")

def create_ticket_if_needed(query: str, risk_result: dict) -> dict | None:
    """
    If needs_escalation is True, create a ticket in the database.
    Returns ticket dict {ticket_id, status} or None.
    """
    if not risk_result.get('needs_escalation', False):
        return None
    
    ticket_id = generate_ticket_id()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO tickets (ticket_id, timestamp, query, risk_level, reason, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        ticket_id,
        datetime.now().isoformat(),
        query,
        risk_result.get('risk_level', 'Medium'),
        risk_result.get('reason', 'No reason provided'),
        'Pending Review'
    ))
    
    conn.commit()
    conn.close()
    
    print(f"🎫 Created ticket: {ticket_id} for query: {query[:50]}...")
    return {"ticket_id": ticket_id, "status": "Pending Review"}

def get_all_tickets() -> list:
    """Retrieve all tickets (for admin dashboard later)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tickets ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    tickets = []
    for row in rows:
        tickets.append({
            "ticket_id": row[0],
            "timestamp": row[1],
            "query": row[2],
            "risk_level": row[3],
            "reason": row[4],
            "status": row[5]
        })
    return tickets

def get_audit_log(limit=100) -> list:
    """Retrieve recent audit log entries"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    logs = []
    for row in rows:
        logs.append({
            "id": row[0],
            "timestamp": row[1],
            "query": row[2],
            "risk_level": row[3],
            "compliance_status": row[4],
            "explanation": row[5],
            "citations": row[6]
        })
    return logs

# Initialize database when this module is imported
init_database()

# Test block
if __name__ == "__main__":
    # Simulate a query
    from risk_agent import assess_risk
    from policy_agent import interpret_policy
    
    test_query = "Can I share customer data with a vendor without approval?"
    
    print(f"\n🔍 Testing with query: {test_query}")
    
    # Get interpretation and risk
    interpretation = interpret_policy(test_query)
    risk = assess_risk(test_query)
    
    # Log the query
    log_query(test_query, risk, interpretation)
    
    # Create ticket if needed
    ticket = create_ticket_if_needed(test_query, risk)
    
    print("\n--- Results ---")
    print("Risk Level:", risk.get('risk_level'))
    print("Compliance Status:", risk.get('compliance_status'))
    print("Escalation needed:", risk.get('needs_escalation'))
    if ticket:
        print("Ticket created:", ticket)
    
    # Display all tickets
    print("\n--- All Tickets ---")
    for t in get_all_tickets():
        print(f"{t['ticket_id']}: {t['query'][:60]}... | Status: {t['status']}")