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
  onboardingStep: string;
  bio: string | null;
  logoUrl: string | null;
  storeBannerUrl: string | null;
  termsAcceptedAt: string | null;
  createdAt: string | null;
  user: {
    name: string;
    email: string;
  };
}

export default function KYCClient({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApprove = async (supplierId: string) => {
    if (!confirm("Are you sure you want to approve this supplier's KYC?")) return;

    setProcessing(true);
    const result = await approveKYC(supplierId);

    if (result.success) {
      toast.success("KYC Approved", {
        description: result.message,
      });
      setSelectedSupplier(null);
      router.refresh();
    } else {
      toast.error("Failed to approve KYC", {
        description: result.error,
      });
    }
    setProcessing(false);
  };

  const handleReject = async (supplierId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    if (!confirm("Are you sure you want to reject this supplier's KYC?")) return;

    setProcessing(true);
    const result = await rejectKYC(supplierId, rejectionReason);

    if (result.success) {
      toast.success("KYC Rejected", {
        description: result.message,
      });
      setSelectedSupplier(null);
      setRejectionReason("");
      router.refresh();
    } else {
      toast.error("Failed to reject KYC", {
        description: result.error,
      });
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
              <p className="text-sm text-gray-500 mt-1">
                Review and verify supplier documents
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {suppliers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">✓</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No pending KYC verifications at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Suppliers List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Verifications ({suppliers.length})
              </h2>
              {suppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  onClick={() => setSelectedSupplier(supplier)}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                    selectedSupplier?.id === supplier.id
                      ? "border-blue-500 shadow-lg"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{supplier.businessName}</h3>
                      <p className="text-sm text-gray-500">{supplier.user.name}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                      Pending
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📧 {supplier.user.email}</p>
                    <p>📱 {supplier.phone}</p>
                    <p>
                      📍 {supplier.state || "N/A"} •{" "}
                      {supplier.supplierType === "LOCAL" ? "Local" : "Dropship"}
                    </p>
                    {supplier.kycSubmittedAt && (
                      <p className="text-xs text-gray-500">
                        Submitted{" "}
                        {new Date(supplier.kycSubmittedAt).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Document Viewer */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              {selectedSupplier ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                  {/* Header */}
                  <div className="border-b border-gray-200 pb-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {selectedSupplier.businessName}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedSupplier.user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted on{" "}
                      {selectedSupplier.kycSubmittedAt
                        ? new Date(selectedSupplier.kycSubmittedAt).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </p>
                  </div>

                  {/* Owner Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      👤 Owner Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Full Name:</span>
                        <span className="font-medium text-gray-900">
                          {selectedSupplier.user.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium text-gray-900">
                          {selectedSupplier.user.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-medium text-gray-900">
                          {selectedSupplier.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Business Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      🏢 Business Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Business Name:</span>
                        <span className="font-medium text-gray-900">
                          {selectedSupplier.businessName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Supplier Type:</span>
                        <span className="font-medium text-gray-900">
                          {selectedSupplier.supplierType === "LOCAL" ? "🚚 Local (2-3 days)" : "✈️ Dropship (14-21 days)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">State:</span>
                        <span className="font-medium text-gray-900">
                          {selectedSupplier.state || "Not provided"}
                        </span>
                      </div>
                      {selectedSupplier.address && (
                        <div>
                          <span className="text-gray-500 block mb-1">Business Address:</span>
                          <p className="font-medium text-gray-900 bg-white rounded p-2">
                            {selectedSupplier.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KYC Document */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      📄 KYC Document
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-700">
                        <strong>Document Type:</strong> {selectedSupplier.kycDocType || "Not specified"}
                      </p>
                    </div>
                    {selectedSupplier.kycDocUrl ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {selectedSupplier.kycDocUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={selectedSupplier.kycDocUrl}
                            alt="KYC Document"
                            className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(selectedSupplier.kycDocUrl!, "_blank")}
                          />
                        ) : (
                          <div className="p-8 text-center bg-gray-50">
                            <div className="text-4xl mb-3">📄</div>
                            <p className="text-gray-500 mb-4 text-sm">
                              Document preview not available
                            </p>
                            <a
                              href={selectedSupplier.kycDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              📥 Download & View Document
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-red-600">⚠️ No document uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Verification Checklist */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      ✓ Verification Checklist
                    </h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2 text-sm">
                      <p className="font-semibold text-yellow-900 mb-2">Please verify:</p>
                      <label className="flex items-start gap-2 text-yellow-800">
                        <input type="checkbox" className="mt-1" />
                        <span>Business name matches KYC document</span>
                      </label>
                      <label className="flex items-start gap-2 text-yellow-800">
                        <input type="checkbox" className="mt-1" />
                        <span>Owner name matches KYC document</span>
                      </label>
                      <label className="flex items-start gap-2 text-yellow-800">
                        <input type="checkbox" className="mt-1" />
                        <span>Contact information is valid</span>
                      </label>
                      <label className="flex items-start gap-2 text-yellow-800">
                        <input type="checkbox" className="mt-1" />
                        <span>Document is clear and readable</span>
                      </label>
                      <label className="flex items-start gap-2 text-yellow-800">
                        <input type="checkbox" className="mt-1" />
                        <span>All required information provided</span>
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <button
                      onClick={() => handleApprove(selectedSupplier.id)}
                      disabled={processing}
                      className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processing ? "Processing..." : "✓ Approve & Activate Supplier"}
                    </button>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700 block">
                        Rejection Reason (required):
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this supplier is being rejected (e.g., unclear documents, missing information, invalid business details)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
                        rows={4}
                      />
                      <button
                        onClick={() => handleReject(selectedSupplier.id)}
                        disabled={processing || !rejectionReason.trim()}
                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processing ? "Processing..." : "✗ Reject Supplier"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a supplier
                  </h3>
                  <p className="text-gray-500">
                    Choose a supplier from the list to review their KYC documents
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
