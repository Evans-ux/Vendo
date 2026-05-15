"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveKYC, rejectKYC } from "@/app/actions/admin";

interface Supplier {
  id: string;
  businessName: string;
  phone: string;
  address: string | null;
  state: string | null;
  supplierType: string;
  kycStatus: string;
  kycDocUrl: string | null;
  kycDocType: string | null;
  kycSubmittedAt: string | null;
  // NEW: Business Verification
  businessDocUrl: string | null;
  businessDocType: string | null;
  // NEW: Bank Account Details
  bankName: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  // Other fields
  onboardingStep: string;
  bio: string | null;
  user: { name: string; email: string };
}

type ConfirmAction = { type: "approve"; supplierId: string } | { type: "reject"; supplierId: string; reason: string } | null;

// ── Inline confirmation modal — no browser confirm() ──────────────────────────
function ConfirmModal({
  action,
  onConfirm,
  onCancel,
  processing,
}: {
  action: ConfirmAction;
  onConfirm: () => void;
  onCancel: () => void;
  processing: boolean;
}) {
  if (!action) return null;

  const isApprove = action.type === "approve";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isApprove ? "bg-green-100" : "bg-red-100"
        }`}>
          <span className="text-2xl">{isApprove ? "✓" : "✗"}</span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          {isApprove ? "Approve this supplier?" : "Reject this supplier?"}
        </h3>

        <p className="text-sm text-gray-500 text-center mb-6">
          {isApprove
            ? "This will verify their identity, activate their account, and approve all their uploaded products."
            : `Their account will remain inactive. They'll see your reason and can re-submit.`}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              isApprove
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isApprove ? "Approving..." : "Rejecting..."}
              </span>
            ) : isApprove ? "Yes, approve" : "Yes, reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function KYCClient({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConfirmAction>(null);

  const confirmApprove = (supplierId: string) => {
    setPendingAction({ type: "approve", supplierId });
  };

  const confirmReject = (supplierId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason before rejecting.");
      return;
    }
    setPendingAction({ type: "reject", supplierId, reason: rejectionReason });
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setProcessing(true);

    if (pendingAction.type === "approve") {
      const result = await approveKYC(pendingAction.supplierId);
      if (result.success) {
        toast.success("Supplier approved", { description: result.message });
        setSelected(null);
        router.refresh();
      } else {
        toast.error("Approval failed", { description: result.error });
      }
    } else {
      const result = await rejectKYC(pendingAction.supplierId, pendingAction.reason);
      if (result.success) {
        toast.error("Supplier rejected", {
          description: "They have been notified with your reason.",
        });
        setSelected(null);
        setRejectionReason("");
        router.refresh();
      } else {
        toast.error("Rejection failed", { description: result.error });
      }
    }

    setProcessing(false);
    setPendingAction(null);
  };

  return (
    <>
      <ConfirmModal
        action={pendingAction}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
        processing={processing}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
              <p className="text-sm text-gray-500 mt-0.5">Review and verify supplier documents</p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              ← Dashboard
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {suppliers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500">No pending KYC verifications right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Supplier list ── */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Pending · {suppliers.length}
                </p>
                {suppliers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelected(s); setRejectionReason(""); }}
                    className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                      selected?.id === s.id
                        ? "border-orange-400 shadow-md ring-1 ring-orange-400/30"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{s.businessName}</p>
                        <p className="text-sm text-gray-500">{s.user.name}</p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        Pending
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      <p>📧 {s.user.email}</p>
                      <p>📱 {s.phone}</p>
                      <p>📍 {s.state || "N/A"} · {s.supplierType === "LOCAL" ? "Local" : "Dropship"}</p>
                      {s.kycSubmittedAt && (
                        <p className="text-xs text-gray-400 pt-1">
                          Submitted {new Date(s.kycSubmittedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Document viewer + actions ── */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                {selected ? (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Supplier header */}
                    <div className="px-6 py-4 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{selected.businessName}</p>
                      <p className="text-sm text-gray-500">{selected.user.email}</p>
                    </div>

                    {/* Document */}
                    <div className="px-6 py-4 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {selected.kycDocType || "Document"}
                      </p>
                      {selected.kycDocUrl ? (
                        selected.kycDocUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={selected.kycDocUrl}
                            alt="KYC Document"
                            className="w-full rounded-lg border border-gray-100"
                          />
                        ) : (
                          <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                            <p className="text-4xl mb-3">📄</p>
                            <p className="text-sm text-gray-500 mb-4">Preview not available for this file type</p>
                            <a
                              href={selected.kycDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              Open document ↗
                            </a>
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-gray-400 italic">No document uploaded</p>
                      )}
                    </div>

                    {/* Business details */}
                    <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["Phone", selected.phone],
                        ["State", selected.state || "N/A"],
                        ["Type", selected.supplierType === "LOCAL" ? "Local" : "Dropship"],
                        ["Address", selected.address || "N/A"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                          <p className="font-medium text-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-5 space-y-3">
                      <button
                        onClick={() => confirmApprove(selected.id)}
                        disabled={processing}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                      >
                        ✓ Approve Supplier
                      </button>

                      <div className="space-y-2">
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Rejection reason — the supplier will see this message"
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none outline-none transition"
                          rows={3}
                        />
                        <button
                          onClick={() => confirmReject(selected.id)}
                          disabled={processing || !rejectionReason.trim()}
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
                        >
                          ✗ Reject Supplier
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                    <p className="text-4xl mb-3">👈</p>
                    <p className="font-semibold text-gray-900 mb-1">Select a supplier</p>
                    <p className="text-sm text-gray-400">Click a name on the left to review their documents</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </>
  );
}
