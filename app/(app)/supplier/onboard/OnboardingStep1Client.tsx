"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT",
];

const profileSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(80, "Business name is too long"),
  phone: z
    .string()
    .regex(
      /^(0|\+234)[789][01]\d{8}$/,
      "Enter a valid Nigerian phone number (e.g. 08012345678)"
    ),
  state: z.string().optional(),
  supplierType: z.enum(["LOCAL", "DROPSHIP"] as const, {
    error: "Please select a supplier type",
  }),
  address: z.string().optional(),
  bio: z.string().max(300, "Description must be under 300 characters").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function OnboardingStep1Client() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: "",
      phone: "",
      address: "",
      state: "",
      supplierType: "LOCAL",
      bio: "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    const toastId = toast.loading("Saving your business profile...");

    try {
      const res = await fetch("/api/supplier/onboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "Failed to save profile.", { id: toastId });
        return;
      }

      toast.success("Profile saved! Moving to KYC verification.", { id: toastId });
      router.push("/supplier/onboard/kyc");
    } catch {
      toast.error("Network error. Please check your connection and try again.", { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Business Name */}
      <div className="space-y-1">
        <Label htmlFor="businessName">
          Business Name <span className="text-brand-orange">*</span>
        </Label>
        <Input
          id="businessName"
          placeholder="e.g. Rocybits Fashion Store"
          className="focus-visible:ring-brand-orange"
          {...register("businessName")}
        />
        {errors.businessName && (
          <p className="text-xs text-destructive mt-1">{errors.businessName.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <Label htmlFor="phone">
          Phone Number <span className="text-brand-orange">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="e.g. 08012345678"
          className="focus-visible:ring-brand-orange"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
        )}
      </div>

      {/* State & Supplier Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <Label htmlFor="state">State</Label>
          <Select id="state" className="focus-visible:ring-brand-orange" {...register("state")}>
            <option value="">Select state</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="supplierType">
            Supplier Type <span className="text-brand-orange">*</span>
          </Label>
          <Select id="supplierType" {...register("supplierType")}>
            <option value="LOCAL">Local (I ship products myself)</option>
            <option value="DROPSHIP">Dropship (Third-party fulfillment)</option>
          </Select>
          {errors.supplierType && (
            <p className="text-xs text-destructive mt-1">{errors.supplierType.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Local: 2–3 day delivery. Dropship: 14–21 days.
          </p>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1">
        <Label htmlFor="address">Physical Address</Label>
        <Input
          id="address"
          placeholder="e.g. 12 Market Road, Onitsha"
          className="focus-visible:ring-brand-orange"
          {...register("address")}
        />
        <p className="text-xs text-muted-foreground">
          Required for local suppliers, optional for dropshippers.
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-1">
        <Label htmlFor="bio">Store Description</Label>
        <Textarea
          id="bio"
          placeholder="Tell customers about what you sell and why they should buy from you..."
          rows={3}
          className="focus-visible:ring-brand-orange resize-none"
          {...register("bio")}
        />
        {errors.bio && (
          <p className="text-xs text-destructive mt-1">{errors.bio.message}</p>
        )}
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
          disabled={isSubmitting}
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
        >
          {isSubmitting ? "Saving Profile..." : "Continue to Next Step"}
        </Button>
      </div>
    </form>
  );
}
