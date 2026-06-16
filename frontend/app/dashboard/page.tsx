// frontend/app/dashboard/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Ticket,
  FileText,
  AlertTriangle,
  Clock,
  Activity,
  Upload,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type TicketType = {
  ticket_id: string;
  timestamp: string;
  query: string;
  risk_level: string;
  reason: string;
  status: string;
};

type AuditLogEntry = {
  id: number;
  timestamp: string;
  query: string;
  risk_level: string;
  compliance_status: string;
  explanation: string;
  citations: string;
};

type Stats = {
  totalTickets: number;
  pendingTickets: number;
  highRiskQueries: number;
  totalQueries: number;
};

export default function DashboardPage() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [policies, setPolicies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tickets" | "audit" | "policies">("tickets");

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");

    if (!token) {
      router.push("/login");
    } else if (role !== "admin") {
      router.push("/");
    } else {
      setIsAuthorized(true);
      fetchDashboardData();
    }
  }, [router]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("access_token");
    try {
      const [ticketsRes, auditRes, policiesRes] = await Promise.all([
        fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/audit-log?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/policies`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!ticketsRes.ok || !auditRes.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      setTickets(await ticketsRes.json());
      setAuditLog(await auditRes.json());
      if (policiesRes.ok) setPolicies(await policiesRes.json());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploadStatus("uploading");
    setUploadMessage("");
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", uploadFile);
    try {
      const res = await fetch(`${API_URL}/upload-policy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setUploadStatus("success");
      setUploadMessage(data.message);
      setUploadFile(null);
      setTimeout(() => fetchDashboardData(), 1200);
    } catch (err: any) {
      setUploadStatus("error");
      setUploadMessage(err.message || "Upload failed");
    }
  };

  const getStats = (): Stats => ({
    totalTickets: tickets.length,
    pendingTickets: tickets.filter((t) => t.status === "Pending Review").length,
    highRiskQueries: auditLog.filter((a) => a.risk_level === "High").length,
    totalQueries: auditLog.length,
  });

  const stats = getStats();

  const getRiskBadge = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return <span className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded text-xs font-medium border border-red-800">High</span>;
      case "medium":
        return <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded text-xs font-medium border border-yellow-800">Medium</span>;
      case "low":
        return <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs font-medium border border-green-800">Low</span>;
      default:
        return <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">Unknown</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending review":
        return <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded text-xs font-medium border border-yellow-800">⏳ Pending</span>;
      case "approved":
        return <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs font-medium border border-green-800">✅ Approved</span>;
      case "rejected":
        return <span className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded text-xs font-medium border border-red-800">❌ Rejected</span>;
      default:
        return <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">{status || "Unknown"}</span>;
    }
  };

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-gray-200">
      {/* Header */}
      <div className="border-b border-[#3c3f45] bg-[#2b2d31] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-gray-200 transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-semibold">Compliance Dashboard</h1>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 bg-[#313338] hover:bg-[#3c3f45] rounded-lg text-sm text-gray-300 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#2b2d31] border border-[#3c3f45] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Queries</p>
                <p className="text-2xl font-bold text-gray-200">{stats.totalQueries}</p>
              </div>
              <Activity className="text-indigo-400" size={24} />
            </div>
          </div>
          <div className="bg-[#2b2d31] border border-[#3c3f45] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-200">{stats.totalTickets}</p>
              </div>
              <Ticket className="text-yellow-400" size={24} />
            </div>
          </div>
          <div className="bg-[#2b2d31] border border-[#3c3f45] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingTickets}</p>
              </div>
              <Clock className="text-yellow-400" size={24} />
            </div>
          </div>
          <div className="bg-[#2b2d31] border border-[#3c3f45] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">High Risk Queries</p>
                <p className="text-2xl font-bold text-red-400">{stats.highRiskQueries}</p>
              </div>
              <AlertTriangle className="text-red-400" size={24} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 border-b border-[#3c3f45]">
          {(["tickets", "audit", "policies"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? "text-indigo-400 border-b-2 border-indigo-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab === "tickets" && `Tickets (${tickets.length})`}
              {tab === "audit" && `Audit Log (${auditLog.length})`}
              {tab === "policies" && `Policies (${policies.length})`}
            </button>
          ))}
        </div>

        {/* Tickets Table */}
        {activeTab === "tickets" && (
          <div className="bg-[#2b2d31] border border-[#3c3f45] rounded-lg overflow-hidden">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Ticket className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                <p>No tickets created yet</p>
                <p className="text-sm">High-risk queries will appear here automatically</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#313338] border-b border-[#3c3f45]">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Ticket ID</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Query</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Risk</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.ticket_id} className="border-b border-[#3c3f45] hover:bg-[#313338] transition">
                        <td className="px-4 py-3 font-mono text-indigo-400">{ticket.ticket_id}</td>
                        <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{ticket.query}</td>
                        <td className="px-4 py-3">{getRiskBadge(ticket.risk_level)}</td>
                        <td className="px-4 py-3">{getStatusBadge(ticket.status)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(ticket.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Audit Log Table */}
        {activeTab === "audit" && (
          <div className="bg-[#2b2d31] border border-[#3c3f45] rounded-lg overflow-hidden">
            {auditLog.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <FileText className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                <p>No queries logged yet</p>
                <p className="text-sm">Start asking questions to build the audit trail</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#313338] border-b border-[#3c3f45]">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">#</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Query</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Risk</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((entry) => (
                      <tr key={entry.id} className="border-b border-[#3c3f45] hover:bg-[#313338] transition">
                        <td className="px-4 py-3 text-gray-500">{entry.id}</td>
                        <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{entry.query}</td>
                        <td className="px-4 py-3">{getRiskBadge(entry.risk_level)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${
                              entry.compliance_status === "Approved"
                                ? "bg-green-900/50 text-green-300 border-green-800"
                                : entry.compliance_status === "Restricted"
                                ? "bg-yellow-900/50 text-yellow-300 border-yellow-800"
                                : "bg-red-900/50 text-red-300 border-red-800"
                            }`}
                          >
                            {entry.compliance_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(entry.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === "policies" && (
          <div className="space-y-4">
            {/* Upload Card */}
            <div className="bg-[#2b2d31] border border-[#3c3f45] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Upload size={16} className="text-indigo-400" />
                Upload New Policy
              </h3>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-[#3c3f45] hover:border-indigo-500 rounded-lg px-4 py-3 text-sm text-gray-400 hover:text-gray-200 transition flex items-center gap-2">
                    <FileText size={16} />
                    {uploadFile ? uploadFile.name : "Click to select a PDF file…"}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      setUploadFile(e.target.files?.[0] || null);
                      setUploadStatus("idle");
                      setUploadMessage("");
                    }}
                  />
                </label>
                {uploadFile && (
                  <button
                    onClick={() => {
                      setUploadFile(null);
                      setUploadStatus("idle");
                      setUploadMessage("");
                    }}
                    className="text-gray-500 hover:text-red-400 transition"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploadStatus === "uploading"}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition flex items-center gap-2"
                >
                  <Upload size={14} />
                  {uploadStatus === "uploading" ? "Uploading…" : "Upload"}
                </button>
              </div>
              {uploadMessage && (
                <p className={`mt-3 text-xs ${uploadStatus === "success" ? "text-green-400" : "text-red-400"}`}>
                  {uploadMessage}
                </p>
              )}
              {uploadStatus === "success" && (
                <p className="mt-1 text-xs text-gray-500">
                  Re-indexing is running in the background — queries will reflect the new policy shortly.
                </p>
              )}
            </div>

            {/* Existing Policies List */}
            <div className="bg-[#2b2d31] border border-[#3c3f45] rounded-lg overflow-hidden">
              {policies.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FileText className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                  <p>No policy files found</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[#313338] border-b border-[#3c3f45]">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium w-12">#</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Filename</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((name, i) => (
                      <tr key={name} className="border-b border-[#3c3f45] hover:bg-[#313338] transition">
                        <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 text-gray-300 flex items-center gap-2">
                          <FileText size={14} className="text-indigo-400 shrink-0" />
                          {name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}