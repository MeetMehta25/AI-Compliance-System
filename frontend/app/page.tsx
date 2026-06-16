"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Added import for Link
import {
  MessageSquare,
  Ticket,
  LayoutDashboard,
  FileText,
  Settings,
  User,
  Send,
  ExternalLink,
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
  timestamp: Date;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ask");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

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

      if (!response.ok) throw new Error("API request failed");

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
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
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

  // Updated sidebar items with href
  const sidebarItems = [
    { id: "ask", label: "Ask a question", icon: MessageSquare, href: "/" },
    { id: "tickets", label: "My tickets", icon: Ticket, href: "/tickets" },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    { id: "policies", label: "Policies", icon: FileText, href: "/policies" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <div className="flex h-screen bg-[#1e1f22] text-gray-200">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2b2d31] border-r border-[#3c3f45] flex flex-col">
        <div className="p-4 border-b border-[#3c3f45]">
          <h1 className="text-xl font-bold text-indigo-400">ComplianceAI</h1>
          <p className="text-xs text-gray-400">Policy assistant</p>
        </div>
        <button
          onClick={() => {
            localStorage.clear();
            router.push("/login");
          }}
          className="w-full text-left text-xs text-gray-500 hover:text-gray-300 mt-2 px-3 py-1"
        >
          Logout
        </button>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-indigo-900/50 text-indigo-300"
                    : "text-gray-400 hover:bg-[#313338] hover:text-gray-200"
                }`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#3c3f45]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#3c3f45] rounded-full flex items-center justify-center">
              <User size={16} className="text-gray-300" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-200">Employee</p>
              <p className="text-xs text-gray-400">employee@corp.com</p>
            </div>
          </div>
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
                    onClick={() => {
                      setInput(q);
                      sendMessage();
                    }}
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
                      {msg.decision && (
                        <div className="flex gap-2 items-center">
                          {getStatusBadge(msg.decision.compliance_status)}
                          {getRiskBadge(msg.decision.risk_level)}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">
                        {msg.explanation || msg.content}
                      </p>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#3c3f45]">
                          <p className="text-xs font-semibold text-gray-400 mb-2">
                            Sources cited
                          </p>
                          <ul className="space-y-1">
                            {msg.citations.map((c, i) => (
                              <li
                                key={i}
                                className="text-xs text-indigo-400 flex items-center gap-1"
                              >
                                <ExternalLink size={12} />
                                {c.filename} — Section {c.section}
                              </li>
                            ))}
                          </ul>
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
              <div className="bg-[#313338] border border-[#3c3f45] rounded-lg p-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                </div>
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
