/**
 * lib/mailer.ts
 *
 * Nodemailer transporter configured for Zoho SMTP.
 * From address: support@vendo.com.ng
 *
 * Setup required:
 *   1. Log into Zoho Mail → Settings → Security → App Passwords
 *   2. Create an app password for "Vendo API"
 *   3. Set SMTP_PASS=<that password> in your .env.local
 *
 * All other SMTP env vars are pre-configured for Zoho in .env.
 */

import nodemailer from "nodemailer";

// Lazy singleton — transporter is created once and reused
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? "smtp.zoho.com",
    port:   Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== "false", // true for port 465
    auth: {
      user: process.env.SMTP_USER ?? "support@vendo.com.ng",
      pass: process.env.SMTP_PASS ?? "",
    },
  });

  return _transporter;
}

export interface SendMailOptions {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
}

/**
 * Send a transactional email via Zoho SMTP.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 * Never throws — callers should handle the error gracefully.
 */
export async function sendMail(opts: SendMailOptions): Promise<{ ok: boolean; error?: string }> {
  const pass = process.env.SMTP_PASS;
  if (!pass || pass === "your_zoho_app_password_here") {
    console.warn("[Mailer] SMTP_PASS not configured — email not sent to:", opts.to);
    return { ok: false, error: "SMTP not configured" };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from:    process.env.SMTP_FROM ?? "Vendo Support <support@vendo.com.ng>",
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
      text:    opts.text ?? opts.html.replace(/<[^>]+>/g, ""),
    });
    return { ok: true };
  } catch (err: any) {
    console.error("[Mailer] Send failed:", err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export function pinChangedEmail(opts: {
  businessName: string;
  email: string;
  isNew: boolean;
  timestamp: string;
  ipHint?: string;
}): { subject: string; html: string } {
  const action = opts.isNew ? "set" : "changed";
  const subject = opts.isNew
    ? "Your Vendo withdrawal PIN has been set"
    : "Your Vendo withdrawal PIN was changed";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#f97316;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Vendo</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Supplier Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;font-size:18px;color:#111827;font-weight:600;">
                Withdrawal PIN ${action === "set" ? "Set" : "Changed"}
              </h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
                Hi <strong>${opts.businessName}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">
                Your Vendo withdrawal PIN was successfully <strong>${action}</strong> on
                <strong>${opts.timestamp}</strong>.
              </p>

              <!-- Alert box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                      <strong>⚠️ Wasn't you?</strong><br/>
                      If you did not make this change, your account may be compromised.
                      Contact us immediately at
                      <a href="mailto:support@vendo.com.ng" style="color:#b45309;font-weight:600;">support@vendo.com.ng</a>
                      or reply to this email.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                For your security, never share your PIN with anyone — including Vendo staff.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} Vendo · <a href="https://vendo.com.ng" style="color:#9ca3af;">vendo.com.ng</a>
              </p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">
                This is an automated security notification. Do not reply unless you need help.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}
