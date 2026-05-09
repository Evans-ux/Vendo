# Supplier Onboarding — Setup Checklist

Complete these steps before testing the onboarding flow.

---

## ✅ 1. Database Migration

Run the Prisma migration to create all tables:

```bash
bunx prisma migrate dev --name init_vee_ai_schema
```

**Expected output:**
```
✔ Generated Prisma Client
✔ Applied migration init_vee_ai_schema
```

**Verify tables exist:**
```bash
bunx prisma studio
```

You should see: `User`, `Supplier`, `Product`, `Order`, `OrderItem` tables.

---

## ✅ 2. Supabase Storage Buckets

### Create `kyc-documents` bucket (Private)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Storage
2. Click **"New Bucket"**
3. Settings:
   - **Name:** `kyc-documents`
   - **Public:** ❌ OFF (private)
   - **File size limit:** 5MB
   - **Allowed MIME types:** `image/jpeg`, `image/png`, `application/pdf`
4. Click **"Create Bucket"**

### Create `product-images` bucket (Public)

1. Click **"New Bucket"** again
2. Settings:
   - **Name:** `product-images`
   - **Public:** ✅ ON
   - **File size limit:** 5MB
   - **Allowed MIME types:** `image/jpeg`, `image/png`
3. Click **"Create Bucket"**

**Verify buckets exist:**
Go to Storage tab — you should see both buckets listed.

---

## ✅ 3. Environment Variables

Check your `.env.local` file has these:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Database (Prisma)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

**Get these from:**
Supabase Dashboard → Project Settings → API

---

## ✅ 4. Install Dependencies (if not already done)

```bash
bun install
```

---

## ✅ 5. Start Dev Server

```bash
bun run dev
```

**Expected output:**
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
```

---

## ✅ 6. Test the Flow

### Step 1: Sign up / Log in
Your co-coder's auth flow should create a `User` record.

### Step 2: Navigate to onboarding
Go to: `http://localhost:3000/supplier/onboard`

### Step 3: Fill business profile
- Business name: "Test Store"
- Phone: "08012345678"
- State: "Lagos"
- Supplier type: "Local"
- Click **"Continue to KYC"**

### Step 4: Upload KYC document
- Document type: "NIN"
- Upload any JPG/PNG/PDF file
- Click **"Continue to Products"**

### Step 5: Add first product
- Product name: "Test Sneakers"
- Category: "Footwear"
- Base price: 5000
- Stock: 10
- Select sizes: 40, 41, 42
- Upload 1–5 product images
- Click **"Complete Onboarding"**

### Step 6: View dashboard
You should see: **"Your application is under review"** with KYC Pending badge.

---

## ✅ 7. Manually Approve KYC (For Testing)

Open Prisma Studio:
```bash
bunx prisma studio
```

1. Go to **Supplier** table
2. Find your test supplier
3. Edit the record:
   - `kycStatus` → `APPROVED`
   - `isActive` → `true`
   - `kycReviewedAt` → (current timestamp)
4. Save

5. Go to **User** table
6. Find your user
7. Edit:
   - `role` → `SUPPLIER`
8. Save

Refresh the dashboard — you should now see **"You're live!"**

---

## ✅ 8. Verify Product Was Created

In Prisma Studio:
1. Go to **Product** table
2. You should see your test product with:
   - `basePrice` = 5000
   - `sellingPrice` = 6250 (5000 × 1.25)
   - `isApproved` = false
   - `isActive` = true

---

## 🎉 Done!

Your supplier onboarding system is fully functional. Next steps:

1. **Your co-coder:** Finish auth flow + integrate role-based redirects
2. **You:** Build admin dashboard for KYC review
3. **Together:** Build product management pages (view all, edit, delete)

---

## Troubleshooting

### Error: "Supplier profile not found"
**Fix:** Make sure you completed Step 1 (business profile) first.

### Error: "File upload failed"
**Fix:** Check that Supabase Storage buckets exist and have correct permissions.

### Error: "Unauthorized"
**Fix:** Make sure you're logged in via your co-coder's auth flow.

### Error: Prisma Client errors
**Fix:** Run `bunx prisma generate` to regenerate the client.

### Error: Database connection failed
**Fix:** Verify `DATABASE_URL` and `DIRECT_URL` in `.env.local`.

---

## Need Help?

- **Prisma docs:** https://www.prisma.io/docs
- **Supabase Storage docs:** https://supabase.com/docs/guides/storage
- **Next.js App Router docs:** https://nextjs.org/docs/app
- **Shadcn UI docs:** https://ui.shadcn.com

---

**Last updated:** May 9, 2026
