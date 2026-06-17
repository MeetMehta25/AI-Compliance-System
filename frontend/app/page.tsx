"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  LayoutDashboard,
  User,
  Send,
  ExternalLink,
  Plus,
  Clock,
  Trash2,
} from "lucide-react";

type Citation = {
  filename: string;
  section: string;
};

type Decision = {
  compliance_status: string;
  risk_level: string;
  reason: string;
};

type TicketInfo = {
  ticket_id: string;
  status: string;
};

type Message = {
  id: string;
  type: "user" | "assistant";
  content: string;
  decision?: Decision;
  explanation?: string;
  citations?: Citation[];
  needs_escalation?: boolean;
  ticket?: TicketInfo | null;
  confidence?: number | null;
  is_ambiguous?: boolean;
  timestamp: Date;
};

type Session = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SESSIONS_KEY = "compliance_sessions";

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("employee@corp.com");
  const [userRole, setUserRole] = useState("employee");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
      setUserEmail(localStorage.getItem("user_email") || "employee@corp.com");
      setUserRole(localStorage.getItem("user_role") || "employee");
      setSessions(loadSessions());
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist current session whenever messages change
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              messages,
              title: messages[0]?.content.slice(0, 45) || "Session",
            }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }, [messages, currentSessionId]);

  const startNewSession = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInput("");
  };

  const loadSession = (session: Session) => {
    // Timestamps are serialised as strings — restore them as Date objects
    const restored = session.messages.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    setMessages(restored);
    setCurrentSessionId(session.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSessions(updated);
      return updated;
    });
    if (currentSessionId === id) startNewSession();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Create a session on the first message
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = Date.now().toString();
      const newSession: Session = {
        id: sessionId,
        title: input.slice(0, 45),
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setSessions((prev) => {
        const updated = [newSession, ...prev];
        saveSessions(updated);
        return updated;
      });
      setCurrentSessionId(sessionId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok) {
        // Attach status so the catch block can produce a specific message
        const err = Object.assign(new Error("API request failed"), { status: response.status });
        throw err;
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.explanation || data.decision?.reason || "No response",
        decision: data.decision,
        explanation: data.explanation,
        citations: data.citations,
        needs_escalation: data.needs_escalation,
        ticket: data.ticket,
        confidence: data.confidence ?? null,
        is_ambiguous: data.is_ambiguous ?? false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      console.error(error);
      let errorMsg = "Cannot reach the server. Check your connection and try again.";
      if (error instanceof Response || (error && typeof error === "object" && "status" in error)) {
        const status = (error as { status: number }).status;
        if (status === 401 || status === 403) errorMsg = "Your session has expired. Please log in again.";
        else if (status === 429) errorMsg = "The AI is rate-limited right now. Please wait 30 seconds and try again.";
        else if (status === 500) errorMsg = "Something went wrong on our end. Your question was not processed.";
      }
      // Also handle fetch errors with a status on the Response object
      if (error instanceof Error && error.message === "API request failed") {
        errorMsg = "Something went wrong on our end. Your question was not processed.";
      }
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: errorMsg,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return (
          <span className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded text-xs font-medium border border-red-800">
            High Risk
          </span>
        );
      case "medium":
        return (
          <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded text-xs font-medium border border-yellow-800">
            Medium Risk
          </span>
        );
      case "low":
        return (
          <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs font-medium border border-green-800">
            Low Risk
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return (
          <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs font-medium border border-green-800">
            Approved
          </span>
        );
      case "restricted":
        return (
          <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded text-xs font-medium border border-yellow-800">
            Restricted
          </span>
        );
      case "not recommended":
        return (
          <span className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded text-xs font-medium border border-red-800">
            Not Recommended
          </span>
        );
      default:
        return null;
    }
  };

  const suggestedQuestions = [
    "Can I work from another country for a week?",
    "Is this expense reimbursable?",
    "Can I use my personal laptop?",
    "Share customer data with vendor?",
  ];

  return (
    <div className="flex h-screen bg-[#1e1f22] text-gray-200">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2b2d31] border-r border-[#3c3f45] flex flex-col">
        {/* Brand */}
        <div className="p-4 border-b border-[#3c3f45]">
          <h1 className="text-xl font-bold text-indigo-400">ComplianceAI</h1>
          <p className="text-xs text-gray-400">Policy assistant</p>
        </div>

        {/* New Chat button */}
        <div className="p-3 border-b border-[#3c3f45]">
          <button
            onClick={startNewSession}
            className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium text-white transition"
          >
            <Plus size={15} />
            New Chat
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-3 pt-3 space-y-1">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-indigo-300 bg-indigo-900/50"
          >
            <MessageSquare size={18} />
            Ask a question
          </Link>
          {userRole === "admin" && (
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-[#313338] hover:text-gray-200 transition"
            >
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
          )}
        </nav>

        {/* Conversation History */}
        {sessions.length > 0 && (
          <div className="flex-1 overflow-y-auto px-3 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1 flex items-center gap-1">
              <Clock size={11} /> History
            </p>
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSession(s)}
                  className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition group ${
                    currentSessionId === s.id
                      ? "bg-[#3c3f45] text-gray-200"
                      : "text-gray-400 hover:bg-[#313338] hover:text-gray-300"
                  }`}
                >
                  <span className="truncate">{s.title || "Session"}</span>
                  <span
                    onClick={(e) => deleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition shrink-0"
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && <div className="flex-1" />}

        {/* User info + logout */}
        <div className="p-3 border-t border-[#3c3f45] space-y-2">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 bg-[#3c3f45] rounded-full flex items-center justify-center shrink-0">
              <User size={16} className="text-gray-300" />
            </div>
            <div className="text-sm overflow-hidden">
              <p className="font-medium text-gray-200 capitalize truncate">{userRole}</p>
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              router.push("/login");
            }}
            className="w-full text-left text-xs text-gray-500 hover:text-gray-300 px-1 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        <div className="border-b border-[#3c3f45] px-6 py-4 bg-[#2b2d31]">
          <h2 className="text-lg font-semibold text-gray-200">Policy query</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-600 mb-3" />
              <p>Ask a compliance question to get started</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="px-3 py-1.5 bg-[#313338] hover:bg-[#3c3f45] rounded-full text-sm text-gray-300 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-2xl rounded-lg p-4 ${
                    msg.type === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-[#313338] border border-[#3c3f45] text-gray-200"
                  }`}
                >
                  {msg.type === "assistant" ? (
                    <div className="space-y-3">
                      {/* Status + Risk badges */}
                      {msg.decision && (
                        <div className="flex gap-2 items-center flex-wrap">
                          {getStatusBadge(msg.decision.compliance_status)}
                          {getRiskBadge(msg.decision.risk_level)}
                        </div>
                      )}

                      {/* Confidence bar */}
                      {msg.confidence != null && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400">Confidence</span>
                            <span
                              className={`text-xs font-semibold ${
                                msg.confidence >= 0.8
                                  ? "text-green-400"
                                  : msg.confidence >= 0.5
                                  ? "text-yellow-400"
                                  : "text-red-400"
                              }`}
                            >
                              {Math.round(msg.confidence * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#1e1f22] rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                msg.confidence >= 0.8
                                  ? "bg-green-500"
                                  : msg.confidence >= 0.5
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.round(msg.confidence * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Ambiguity banner */}
                      {msg.is_ambiguous && (
                        <div className="flex items-start gap-2 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg">
                          <span className="text-amber-400 text-xs mt-0.5">⚠️</span>
                          <p className="text-xs text-amber-300 leading-relaxed">
                            This question is ambiguous. The answer below is based on the closest matching policy. Consider clarifying your question for a more precise answer.
                          </p>
                        </div>
                      )}

                      <p className="text-sm leading-relaxed">
                        {msg.explanation || msg.content}
                      </p>

                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#3c3f45]">
                          <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                            <ExternalLink size={11} /> Sources cited
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((c, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e1f22] border border-[#3c3f45] rounded-lg"
                              >
                                <span className="text-xs text-gray-300 font-medium">
                                  {c.filename.replace(/\.pdf$/i, "")}
                                </span>
                                <span className="text-xs bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-1.5 py-0.5 rounded font-mono">
                                  § {c.section}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {msg.needs_escalation && msg.ticket && (
                        <div className="mt-3 p-2 bg-yellow-900/30 rounded border border-yellow-800">
                          <p className="text-xs text-yellow-300">
                            🎫 Ticket {msg.ticket.ticket_id} created —{" "}
                            {msg.ticket.status}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#313338] border border-[#3c3f45] rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-xs text-gray-400">Analysing policy documents…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-[#3c3f45] bg-[#2b2d31] p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask a compliance question..."
              className="flex-1 px-4 py-2 bg-[#313338] border border-[#3c3f45] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-200 placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
