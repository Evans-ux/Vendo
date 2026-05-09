"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";


const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
];

export default function SupplierOnboardingStep1() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    phone: "",
    address: "",
    state: "",
    supplierType: "LOCAL",
    bio: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/supplier/onboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || "Something went wrong");
        return;
      }

      // Move to KYC step
      router.push("/supplier/onboard/kyc");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName">
          Business Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="businessName"
          placeholder="e.g. Rocybits Fashion Store"
          value={formData.businessName}
          onChange={(e) =>
            setFormData({ ...formData, businessName: e.target.value })
          }
          required
          className="focus-visible:ring-brand-orange"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="e.g. 08012345678"
          value={formData.phone}
          onChange={(e) =>
            setFormData({ ...formData, phone: e.target.value })
          }
          required
          className="focus-visible:ring-brand-orange"
        />
      </div>

      {/* State & Supplier Type (Side-by-side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select
            id="state"
            value={formData.state}
            onChange={(e) =>
              setFormData({ ...formData, state: e.target.value })
            }
          >
            <option value="">Select state</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierType">
            Supplier Type <span className="text-destructive">*</span>
          </Label>
          <Select
            id="supplierType"
            value={formData.supplierType}
            onChange={(e) =>
              setFormData({ ...formData, supplierType: e.target.value })
            }
            required
          >
            <option value="LOCAL">Local (I ship products myself)</option>
            <option value="DROPSHIP">Dropship (Third-party fulfillment)</option>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Local: 2–3 day delivery. Dropship: 14–21 days.
          </p>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Physical Address</Label>
        <Input
          id="address"
          placeholder="e.g. 12 Market Road, Onitsha"
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          className="focus-visible:ring-brand-orange"
        />
        <p className="text-xs text-muted-foreground">
          Required for local suppliers, optional for dropshippers
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Store Description</Label>
        <Textarea
          id="bio"
          placeholder="Tell customers about what you sell and why they should buy from you..."
          rows={3}
          value={formData.bio}
          onChange={(e) =>
            setFormData({ ...formData, bio: e.target.value })
          }
          className="focus-visible:ring-brand-orange resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4 border-t border-muted/20">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
          className="flex-1 hover:bg-muted/50"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading} 
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
        >
          {loading ? "Saving Profile..." : "Continue to Next Step"}
        </Button>
      </div>
    </form>
  );
}
