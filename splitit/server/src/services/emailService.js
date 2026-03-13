import { resend } from '../config/email.js';

export async function sendVerificationEmail(to, name, token) {
  const url = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'SplitIt <onboarding@resend.dev>',
    to,
    subject: 'Verify your SplitIt email',
    html: `
      <h2>Hi ${name},</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${url}" style="background:#6c63ff;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to, name, token) {
  const url = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'SplitIt <onboarding@resend.dev>',
    to,
    subject: 'Reset your SplitIt password',
    html: `
      <h2>Hi ${name},</h2>
      <p>You requested a password reset. Click the link below:</p>
      <a href="${url}" style="background:#6c63ff;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Reset Password
      </a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}
