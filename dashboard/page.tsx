"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SupplierStatus = {
  businessName: string;
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycRejectionReason?: string;
  isActive: boolean;
  onboardingStep: string;
  productCount: number;
};

export default function SupplierDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<SupplierStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/supplier/status");
      if (!res.ok) {
        // Not a supplier yet — redirect to onboarding
        router.push("/supplier/onboard");
        return;
      }
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getKycBadge = () => {
    switch (status.kycStatus) {
      case "PENDING":
        return <Badge variant="warning">KYC Pending Review</Badge>;
      case "APPROVED":
        return <Badge variant="success">KYC Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">KYC Rejected</Badge>;
    }
  };

  const getStatusMessage = () => {
    if (status.kycStatus === "PENDING") {
      return {
        title: "Your application is under review",
        description:
          "Our admin team is reviewing your KYC document. This usually takes 24–48 hours. You'll receive an email once approved.",
        icon: "⏳",
      };
    }

    if (status.kycStatus === "REJECTED") {
      return {
        title: "KYC verification failed",
        description: status.kycRejectionReason || "Please re-submit your document.",
        icon: "❌",
      };
    }

    if (status.isActive) {
      return {
        title: "You're live!",
        description: `Your store is active. You have ${status.productCount} product(s) listed.`,
        icon: "✅",
      };
    }

    return {
      title: "Almost there",
      description: "Complete your onboarding to start selling.",
      icon: "🚀",
    };
  };

  const message = getStatusMessage();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Supplier Dashboard</h1>
            <p className="text-muted-foreground">{status.businessName}</p>
          </div>
          {getKycBadge()}
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="text-4xl">{message.icon}</div>
              <div>
                <CardTitle>{message.title}</CardTitle>
                <CardDescription>{message.description}</CardDescription>
              </div>
            </div>
          </CardHeader>

          {status.kycStatus === "REJECTED" && (
            <CardContent>
              <Button onClick={() => router.push("/supplier/onboard/kyc")}>
                Re-submit KYC Document
              </Button>
            </CardContent>
          )}

          {status.isActive && (
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={() => router.push("/supplier/products/new")}>
                  Add New Product
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/supplier/products")}
                >
                  View All Products
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Quick Stats */}
        {status.isActive && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Total Products</CardDescription>
                <CardTitle className="text-3xl">{status.productCount}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Pending Orders</CardDescription>
                <CardTitle className="text-3xl">0</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-3xl">₦0</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
