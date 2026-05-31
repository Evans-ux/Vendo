"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveDeleteRequest, rejectDeleteRequest } from "@/app/actions/admin";

interface DeleteRequest {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  product: { name: string; imageUrls: string[]; isDeleted: boolean };
  supplier: { businessName: string };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
  APPROVED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  REJECTED: "bg-red-100   dark:bg-red-900/30   text-red-800   dark:text-red-300",
};

export default function DeleteRequestsClient({ requests }: { requests: DeleteRequest[] }) {
  const router = useRouter();
  const [acting, setActing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DeleteRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  const filtered = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  const handleApprove = async (req: DeleteRequest) => {
    if (!confirm(`Approve deletion of "${req.product.name}" from ${req.supplier.businessName}?`)) return;
    setActing(req.id);
    const result = await approveDeleteRequest(req.id);
    if (result.success) {
      toast.success("Approved", { description: result.message });
      router.refresh();
    } else {
      toast.error("Failed", { description: result.error });
    }
    setActing(null);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectNote.trim()) { toast.error("Please provide a rejection reason."); return; }
    setActing(rejectTarget.id);
    const result = await rejectDeleteRequest(rejectTarget.id, rejectNote.trim());
    if (result.success) {
      toast.success("Rejected", { description: result.message });
      setRejectTarget(null);
      setRejectNote("");
      router.refresh();
    } else {
      toast.error("Failed", { description: result.error });
    }
    setActing(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Delete Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Supplier product removal requests
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {f === "ALL" ? `All (${requests.length})` : `${f} (${requests.filter((r) => r.status === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No requests</h3>
            <p className="text-muted-foreground">No delete requests in this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((req) => (
              <div key={req.id} className="bg-card rounded-2xl border border-border p-5 flex gap-4">
                {/* Product image */}
                {req.product.imageUrls[0] ? (
                  <img
                    src={req.product.imageUrls[0]}
                    alt={req.product.name}
                    className="w-20 h-20 object-cover rounded-xl border border-border shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0 text-3xl">
                    📦
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-foreground">{req.product.name}</p>
                      <p className="text-sm text-muted-foreground">{req.supplier.businessName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_BADGE[req.status]}`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Reason: </span>
                    <span className="text-foreground">{req.reason}</span>
                  </div>

                  {req.adminNote && (
                    <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-3 py-2 text-sm text-red-800 dark:text-red-300">
                      <span className="font-medium">Admin note: </span>{req.adminNote}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted {new Date(req.createdAt).toLocaleDateString("en-NG", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                    {req.reviewedAt && ` · Reviewed ${new Date(req.reviewedAt).toLocaleDateString("en-NG", {
                      year: "numeric", month: "short", day: "numeric",
                    })}`}
                  </p>

                  {req.status === "PENDING" && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={acting === req.id}
                        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {acting === req.id ? "Processing…" : "✓ Approve"}
                      </button>
                      <button
                        onClick={() => { setRejectTarget(req); setRejectNote(""); }}
                        disabled={acting === req.id}
                        className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !acting && setRejectTarget(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground">Reject Delete Request</h3>
            <p className="text-sm text-muted-foreground">
              Rejecting will keep <strong>{rejectTarget.product.name}</strong> live on the store.
              The supplier will be notified with your reason.
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Reason for rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Product has active orders that must be fulfilled first…"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectNote.trim() || !!acting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {acting ? "Rejecting…" : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
