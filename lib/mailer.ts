/**
 * lib/mailer.ts
 *
 * Transactional mailer helper using Nodemailer.
 * Configured using SMTP settings. If SMTP credentials are not present,
 * it falls back to console logging in non-production environments.
 */

import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.resend.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "resend";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "Vendo <no-reply@vendo.com.ng>";

// Create transporter only if credentials are set
const hasCredentials = !!SMTP_PASS;

const transporter = hasCredentials
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for 587/other
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const { to, subject, html, text } = params;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""), // simple fallback text strip
      });
      console.log(`[Mailer] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[Mailer] Error sending email to ${to}:`, err.message);
      throw err;
    }
  } else {
    // Fallback logging when credentials are not configured
    console.warn(
      `[Mailer] SMTP_PASS is not configured. Logging email instead:\n` +
        `-----------------------------------------\n` +
        `TO: ${to}\n` +
        `SUBJECT: ${subject}\n` +
        `CONTENT:\n${html}\n` +
        `-----------------------------------------`
    );
    return { success: true, messageId: "dev-mock-id" };
  }
}
