# Vendo Development Handoff & Progress Notes

This document summarizes the current state of Vendo's integration, payment system, logistics pipeline, and security requirements. Use this as a guide for continuing development or performing code reviews.

---

## 1. Executive Summary & Context
Vendo is a multi-vendor e-commerce platform integrated with a Telegram bot and a Supplier Dashboard. The platform supports:
1. **Telegram Shop Flow:** Customers browse products, place orders, check out, and receive payment links.
2. **Escrow & Wallet:** Customer payments are held by the platform. Once the customer or bot confirms delivery, funds are cleared (after a 24-hour dispute window) and settled to the supplier's wallet/subaccount.
3. **Flutterwave Production Mode:** The system uses Flutterwave V3 in live production mode (`FLW_MODE=production`).
4. **Resend via Supabase SMTP:** Outbound transactional emails (including password recovery and PIN resets) are handled directly via the Supabase SMTP provider connected to Resend.

---

## 2. Completed Features & Architecture
### A. Logistics & Shipping Rates (Sendbox Integration)
* **Bug Fixed:** Previously, the `/api/sendbox/cheapest-rate` endpoint returned a static fallback due to an incorrect payload shape (missing the nested `dimension` object, required `service_type`, `incoming_option`, and `channel_code` properties).
* **Fix Applied:** 
  - [x] Restructured `/api/sendbox/cheapest-rate/route.ts` to build and validate the correct Sendbox payload.
  - [x] Updated `/api/supplier/products/create/route.ts` to fetch live shipping rates during product onboarding instead of relying on a hardcoded static mapping. If the API fails, it gracefully falls back so the supplier is never blocked.
  - [x] Hardened the delivery confirmation endpoint (`/api/supplier/wallet/confirm-delivery/route.ts`) to ensure the correct logistics fee is subtracted from the supplier's gross earnings (which is `basePrice * quantity`).

### B. Subaccount Creation & Retry Logic
* **KYC Approval Integration:** On approving KYC in `app/actions/admin.ts`, the platform automatically attempts to create a Flutterwave subaccount using the supplier's verified NUBAN bank details.
* **Manual Retry Endpoint:** If the automatic creation fails (e.g. temporary network issue), the admin can retry it via `POST /api/subaccounts` (defined in `app/(app)/api/subaccounts/route.ts`).
* **Validation:** Verified that `split_type: "percentage"` with `split_value: 0.9` correctly routes 90% of the transaction to the supplier's subaccount, leaving a 10% platform commission. Added supplier business contact & phone fields for consistent metadata registration.

### C. Secure Withdrawal PIN Reset Flow (Supabase Auth Integration)
* **Design Decision:** Rather than downloading `nodemailer` and creating a new DB table/migration for custom tokens, we use Supabase Auth's native `resetPasswordForEmail` recovery flow. Since Supabase is connected to Resend SMTP, this generates, expires, and secures recovery links automatically.
* **Flow:**
  1. Supplier requests PIN reset via `POST /api/supplier/settings/pin/reset`. This triggers `supabase.auth.resetPasswordForEmail`.
  2. Supplier receives a secure recovery link that automatically logs them into a temporary recovery session and redirects them to `/supplier/settings/pin/confirm-reset` page.
  3. Since they are securely authenticated, the `/api/supplier/settings/pin/confirm-reset` endpoint allows setting a new PIN *without* requiring their forgotten current PIN.
* **Validation:** Both `/api/supplier/settings/pin` and `/api/supplier/settings/pin/confirm-reset` validate PIN strength (disallowing simple repeated patterns like `1111` or sequential codes like `1234`).

### D. Payout/Transfer Endpoint
* **Withdraw Route:** `POST /api/supplier/wallet/withdraw` is fully implemented:
  - Verifies the 4-digit PIN using bcrypt.
  - Enforces process-level rate-limiting (locks PIN attempts for 15 minutes after 5 failures to prevent brute force).
  - Checks supplier's wallet balance.
  - Uses a database transaction to decrement the balance immediately to prevent double-spending.
  - Calls Flutterwave `/transfers` API to initiate the payout.
  - Reverts the balance automatically if the Flutterwave API call fails.
* **Webhook integration:** The existing webhook handles payout callbacks (`transfer.completed`, `transfer.failed`, `transfer.reversed`) and updates the `WithdrawalRequest` status accordingly.

---
*Last Updated: 2026-05-30 by Antigravity*
