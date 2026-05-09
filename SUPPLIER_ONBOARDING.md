# Supplier Onboarding System — Complete Documentation

## Overview

The supplier onboarding system is a 3-step flow that takes a user from registration to becoming an active supplier on the Vee AI platform. It includes business profile creation, KYC verification, and first product upload.

---

## Architecture

### Database Schema

The system uses 4 main tables:

1. **User** — Base identity (created by your co-coder's auth flow)
2. **Supplier** — Business profile (one-to-one with User)
3. **Product** — Product catalog (many-to-one with Supplier)
4. **Order + OrderItem** — Order management (for future use)

See `prisma/schema.prisma` for full schema with detailed comments.

---

## The 3-Step Onboarding Flow

### Step 1: Business Profile (`/supplier/onboard`)

**What it collects:**
- Business name (required)
- Phone number (required)
- Physical address (optional for dropshippers)
- Nigerian state (optional)
- Supplier type: LOCAL or DROPSHIP (required)
- Store bio (optional)

**What it does:**
- Creates or updates a `Supplier` record linked to the authenticated user
- Sets `onboardingStep` to `PROFILE_COMPLETE`
- Redirects to Step 2 (KYC)

**API Route:** `POST /api/supplier/onboard/profile`

---

### Step 2: KYC Verification (`/supplier/onboard/kyc`)

**What it collects:**
- Document type (NIN, BVN, CAC, Passport, Driver's License)
- Document file (JPG, PNG, or PDF, max 5MB)

**What it does:**
- Uploads file to Supabase Storage `kyc-documents` bucket (private)
- Saves file URL, doc type, and submission timestamp to `Supplier` record
- Sets `kycStatus` to `PENDING`
- Sets `onboardingStep` to `KYC_SUBMITTED`
- Redirects to Step 3 (Products)

**API Route:** `POST /api/supplier/onboard/kyc`

**Important:** The `kyc-documents` bucket must be created in Supabase and set to **private**. Only admins should access these files via signed URLs.

---

### Step 3: First Product (`/supplier/onboard/products`)

**What it collects:**
- Product name (required)
- Category (Footwear, Tops, Bottoms, etc.)
- Description (optional)
- Base price (required) — supplier's cost
- Stock quantity (required)
- Available sizes (required, category-dependent)
- Product images (1–5 images, max 5MB each)

**What it does:**
- Uploads images to Supabase Storage `product-images` bucket (public)
- Calculates selling price: `basePrice * 1.25`
- Creates a `Product` record with `isApproved = false`
- Sets `onboardingStep` to `COMPLETED`
- Redirects to Supplier Dashboard

**API Routes:**
- `POST /api/supplier/products/upload-images` — uploads images, returns URLs
- `POST /api/supplier/products` — creates product record

**Important:** The `product-images` bucket must be created in Supabase and set to **public**.

---

## Supplier Dashboard (`/supplier/dashboard`)

**What it shows:**
- KYC status badge (Pending, Approved, Rejected)
- Status message based on current state
- If rejected: rejection reason + button to re-submit KYC
- If approved: quick stats (product count, orders, revenue)
- Action buttons: Add Product, View Products

**API Route:** `GET /api/supplier/status`

---

## Admin Approval Flow (Not Yet Built)

The admin dashboard (future work) will:

1. List all suppliers with `kycStatus = PENDING`, sorted by `kycSubmittedAt`
2. Show KYC document (via signed URL from private bucket)
3. Allow admin to:
   - **Approve** → Set `kycStatus = APPROVED`, `isActive = true`, `User.role = SUPPLIER`, `kycReviewedAt = now()`
   - **Reject** → Set `kycStatus = REJECTED`, `kycRejectionReason = "..."`, `kycReviewedAt = now()`

Once approved, the supplier's products become visible in the Telegram bot search (filtered by `supplier.isActive = true AND product.isApproved = true`).

---

## Supabase Storage Buckets

You need to create 2 buckets in your Supabase project:

### 1. `kyc-documents` (Private)
- **Purpose:** Store supplier identity documents (NIN, CAC, etc.)
- **Access:** Private — only admins can view via signed URLs
- **File types:** JPG, PNG, PDF
- **Max size:** 5MB per file

**How to create:**
1. Go to Supabase Dashboard → Storage
2. Click "New Bucket"
3. Name: `kyc-documents`
4. Public: **OFF** (private)
5. File size limit: 5MB
6. Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`

### 2. `product-images` (Public)
- **Purpose:** Store product photos
- **Access:** Public — anyone can view
- **File types:** JPG, PNG
- **Max size:** 5MB per file

**How to create:**
1. Go to Supabase Dashboard → Storage
2. Click "New Bucket"
3. Name: `product-images`
4. Public: **ON**
5. File size limit: 5MB
6. Allowed MIME types: `image/jpeg`, `image/png`

---

## Environment Variables

Make sure your `.env.local` has:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database (for Prisma)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

---

## Running the Migration

After updating the schema, run:

```bash
bunx prisma migrate dev --name init_vee_ai_schema
```

This will:
1. Create all tables in your Supabase Postgres database
2. Generate the Prisma Client with TypeScript types

---

## UI Components Used

All components are in `components/ui/`:

- **Button** — Primary actions, navigation
- **Input** — Text fields
- **Label** — Form labels
- **Textarea** — Multi-line text (bio, description)
- **Select** — Dropdowns (state, category, doc type)
- **Card** — Container for each step
- **Badge** — KYC status indicators
- **Progress** — Step progress bar (33%, 66%, 100%)
- **Separator** — Visual dividers (not used yet but available)

All components use the brand colors defined in `app/(app)/globals.css`:
- Primary: `#f97316` (orange)
- Background: `#111827` (charcoal)
- Accent: `#fff7ed` (cream)

---

## Brand Colors

From the blueprint:

```css
--brand-orange: #f97316;
--brand-charcoal: #111827;
--brand-cream: #fff7ed;
```

These are applied via CSS variables and Tailwind utility classes:
- `bg-brand-orange` → orange background
- `text-brand-charcoal` → charcoal text
- `bg-brand-cream` → cream background

---

## File Structure

```
app/(app)/
├── supplier/
│   ├── onboard/
│   │   ├── page.tsx              ← Step 1: Business Profile
│   │   ├── kyc/
│   │   │   └── page.tsx          ← Step 2: KYC Upload
│   │   └── products/
│   │       └── page.tsx          ← Step 3: First Product
│   └── dashboard/
│       └── page.tsx              ← Post-onboarding landing
└── api/
    └── supplier/
        ├── onboard/
        │   ├── profile/
        │   │   └── route.ts      ← Save business profile
        │   └── kyc/
        │       └── route.ts      ← Upload KYC document
        ├── products/
        │   ├── upload-images/
        │   │   └── route.ts      ← Upload product images
        │   └── route.ts          ← Create product
        └── status/
            └── route.ts          ← Get supplier status

components/ui/
├── button.tsx
├── input.tsx
├── label.tsx
├── textarea.tsx
├── select.tsx
├── card.tsx
├── badge.tsx
├── progress.tsx
└── separator.tsx

prisma/
└── schema.prisma                 ← Full database schema
```

---

## Testing the Flow

### 1. Start the dev server
```bash
bun run dev
```

### 2. Sign up / Log in
Your co-coder's auth flow creates a `User` record.

### 3. Navigate to `/supplier/onboard`
Fill in the business profile form and submit.

### 4. Upload KYC document
Select doc type, upload file, submit.

### 5. Add first product
Fill in product details, upload images, submit.

### 6. View dashboard
You'll see "KYC Pending Review" status.

### 7. Admin approval (manual for now)
Use Prisma Studio or SQL to manually approve:

```sql
UPDATE "Supplier"
SET "kycStatus" = 'APPROVED',
    "isActive" = true,
    "kycReviewedAt" = NOW()
WHERE "id" = 'your-supplier-id';

UPDATE "User"
SET "role" = 'SUPPLIER'
WHERE "id" = 'your-user-id';
```

### 8. Refresh dashboard
You'll see "You're live!" status.

---

## Next Steps (What Your Co-Coder Needs to Know)

### User Model Updates
The `User` model now has these fields that auth flow should populate:
- `role` — defaults to `CUSTOMER`, becomes `SUPPLIER` after KYC approval
- `telegramId` — set when user first messages the Telegram bot
- `phone` — collected during supplier onboarding or customer checkout
- `shoeSize`, `shirtSize` — collected by Telegram bot for AI recommendations
- `lat`, `lng` — saved when customer shares location via Telegram

### Auth Flow Integration
After signup/login, check if `user.role === 'SUPPLIER'`:
- If yes → redirect to `/supplier/dashboard`
- If no → redirect to home page

### Middleware (Optional)
Create `middleware.ts` to protect supplier routes:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/supplier')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/supplier/:path*'],
};
```

---

## Common Issues & Solutions

### Issue: "Supplier profile not found"
**Cause:** User hasn't completed Step 1 yet.
**Solution:** Redirect to `/supplier/onboard`.

### Issue: Image upload fails
**Cause:** Supabase Storage bucket doesn't exist or has wrong permissions.
**Solution:** Create `product-images` bucket and set to public.

### Issue: KYC upload fails
**Cause:** `kyc-documents` bucket doesn't exist.
**Solution:** Create `kyc-documents` bucket and set to private.

### Issue: Prisma Client errors
**Cause:** Schema changed but client not regenerated.
**Solution:** Run `bunx prisma generate`.

### Issue: Database connection fails
**Cause:** Wrong `DATABASE_URL` or `DIRECT_URL`.
**Solution:** Check `.env.local` and verify Supabase connection strings.

---

## Future Enhancements

1. **Logo upload** — Add logo field to Step 1
2. **Product editing** — Allow suppliers to edit existing products
3. **Bulk product upload** — CSV import for suppliers with large catalogs
4. **Email notifications** — Send email when KYC is approved/rejected
5. **Telegram notifications** — Notify supplier via Telegram bot
6. **Admin dashboard** — Full KYC review interface
7. **Product approval flow** — Admin must approve each product before it goes live
8. **Analytics** — Track supplier performance (orders, revenue, ratings)

---

## Summary

You now have a complete supplier onboarding system with:
- ✅ 3-step onboarding flow (Profile → KYC → Product)
- ✅ Supabase Storage integration (KYC docs + product images)
- ✅ Prisma database schema with full relations
- ✅ API routes for all operations
- ✅ Supplier dashboard with status tracking
- ✅ Brand-consistent UI components
- ✅ KYC verification workflow (pending admin approval)

The only missing piece is the **admin dashboard** for KYC review — that's your next build after your co-coder finishes the auth flow.
