/**
 * POST /api/supplier/settings/pin/request-otp
 *
 * Generates a 6-digit OTP, hashes it, stores it on the supplier row
 * (expires in 10 minutes), and emails it to the supplier.
 *
 * Rate-limited: one OTP per 60 seconds (checked via pinOtpExpiresAt).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { sendMail } from "@/lib/mailer";

function generateOtp(): string {
  // Cryptographically random 6-digit number
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpEmailHtml(opts: {
  businessName: string;
  otp: string;
  expiresMinutes: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#f97316;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Vendo</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:12px;">Supplier Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              Hi <strong>${opts.businessName}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
              You requested to change your withdrawal PIN. Use the code below to verify your identity.
              This code expires in <strong>${opts.expiresMinutes} minutes</strong>.
            </p>
            <!-- OTP box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center" style="background:#f9fafb;border:2px dashed #f97316;border-radius:12px;padding:24px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Your verification code</p>
                  <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:0.25em;color:#111827;">${opts.otp}</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                    <strong>⚠️ Didn't request this?</strong> Someone may be trying to access your account.
                    Contact <a href="mailto:support@vendo.com.ng" style="color:#b45309;font-weight:600;">support@vendo.com.ng</a> immediately.
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#9ca3af;font-size:12px;">Never share this code with anyone, including Vendo staff.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Vendo · vendo.com.ng</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
      include: { user: { select: { email: true } } },
    });
    if (!supplier) {
      return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
    }

    // Rate limit: block if a valid OTP was issued less than 60 seconds ago
    if (supplier.pinOtpExpiresAt) {
      const secondsLeft = (supplier.pinOtpExpiresAt.getTime() - Date.now()) / 1000;
      const cooldownSeconds = 60;
      const otpAgeSeconds = 10 * 60 - secondsLeft; // how old the OTP is
      if (otpAgeSeconds < cooldownSeconds) {
        return NextResponse.json(
          { message: `Please wait ${Math.ceil(cooldownSeconds - otpAgeSeconds)} seconds before requesting another code.` },
          { status: 429 }
        );
      }
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const hashedOtp = await bcrypt.hash(otp, 10);

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { pinOtp: hashedOtp, pinOtpExpiresAt: expiresAt },
    });

    const result = await sendMail({
      to:      supplier.user.email,
      subject: "Your Vendo PIN verification code",
      html:    otpEmailHtml({ businessName: supplier.businessName, otp, expiresMinutes: 10 }),
    });

    if (!result.ok) {
      // If email fails, clear the OTP so they can retry
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { pinOtp: null, pinOtpExpiresAt: null },
      });
      return NextResponse.json(
        { message: "Failed to send verification email. Check your SMTP configuration." },
        { status: 500 }
      );
    }

    // Mask the email for the response (e.g. s***@vendo.com.ng)
    const email = supplier.user.email;
    const [local, domain] = email.split("@");
    const maskedEmail = `${local[0]}***@${domain}`;

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${maskedEmail}`,
      maskedEmail,
    });
  } catch (error: any) {
    console.error("[Request OTP] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
