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
      bio: "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    const toastId = toast.loading("Saving your business profile...");

    try {
      const res = await fetch("/api/supplier/onboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // All suppliers are LOCAL — delivery method is chosen per-product at step 3
        body: JSON.stringify({ ...data, supplierType: "LOCAL" }),
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

      {/* State */}
      <div className="space-y-1">
        <Label htmlFor="state">State</Label>
        <select
          id="state"
          {...register("state")}
          className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
        >
          <option value="">Select your state</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
        <p className="text-xs text-muted-foreground mt-1">
          Your pickup/dispatch address — customers won't see this.
        </p>
      </div>

      {/* Delivery info banner */}
      <div className="rounded-xl bg-brand-orange/5 border border-brand-orange/20 p-4">
        <p className="text-sm font-semibold text-brand-orange mb-1">📦 Delivery Method</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You'll choose how each product is delivered (your own waybill or Vendo logistics) when you add products in Step 3. No need to decide now.
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-1">
        <Label htmlFor="bio">Store Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
      <div className="flex gap-4 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
        >
          {isSubmitting ? "Saving..." : "Continue to KYC →"}
        </Button>
      </div>
    </form>
  );
}
