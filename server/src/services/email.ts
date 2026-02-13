import { Resend } from 'resend';

// Initialize Resend (will be undefined if no API key)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Lyne Tilt Studio <hello@lynetilt.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  if (!resend) {
    console.log('=== EMAIL (DEV MODE - No Resend API Key) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('HTML:', html.substring(0, 500) + '...');
    console.log('============================================');
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

// Base email template wrapper
function wrapInTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lyne Tilt Studio</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border:1px solid #e7e5e4;">
          <!-- Header -->
          <tr>
            <td style="padding:30px 40px;border-bottom:1px solid #e7e5e4;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:normal;color:#1c1917;letter-spacing:0.1em;">LYNE TILT STUDIO</h1>
              <p style="margin:8px 0 0;font-size:11px;color:#78716c;letter-spacing:0.15em;text-transform:uppercase;">Wearable Art & Creative Coaching</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;color:#44403c;font-size:16px;line-height:1.7;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:30px 40px;background-color:#fafaf9;border-top:1px solid #e7e5e4;text-align:center;">
              <p style="margin:0 0 15px;font-size:12px;color:#78716c;">
                <a href="${FRONTEND_URL}/#/shop" style="color:#8d3038;text-decoration:none;margin:0 10px;">Shop</a>
                <a href="${FRONTEND_URL}/#/coaching" style="color:#8d3038;text-decoration:none;margin:0 10px;">Coaching</a>
                <a href="${FRONTEND_URL}/#/learn" style="color:#8d3038;text-decoration:none;margin:0 10px;">Learn</a>
              </p>
              <p style="margin:0;font-size:11px;color:#a8a29e;">
                Australia-based &middot; Est. 2023<br>
                &copy; 2025 Lyne Tilt Studio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateVerificationEmail(firstName: string, verificationToken: string): { subject: string; html: string } {
  const verificationUrl = `${FRONTEND_URL}/#/verify-email?token=${verificationToken}`;

  const content = `
    <h2 style="margin:0 0 20px;font-size:22px;color:#1c1917;font-weight:normal;">Verify Your Account</h2>
    <p style="margin:0 0 20px;">Hi ${firstName},</p>
    <p style="margin:0 0 20px;">Before you can use all account features, we need to verify your account.</p>
    <p style="margin:0 0 30px;text-align:center;">
      <a href="${verificationUrl}" style="display:inline-block;background-color:#1c1917;color:#ffffff;padding:16px 32px;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;font-weight:bold;">Verify Your Account</a>
    </p>
    <p style="margin:0 0 10px;font-size:14px;color:#78716c;">This link will expire in 24 hours.</p>
    <p style="margin:0;font-size:14px;color:#78716c;">If you didn't create an account, please ignore this email or <a href="${FRONTEND_URL}/#/contact" style="color:#8d3038;">contact us</a> to deactivate the account.</p>
  `;

  return {
    subject: 'Lyne Tilt Studio - Verify your account',
    html: wrapInTemplate(content),
  };
}

export function generateWelcomeEmail(firstName: string): { subject: string; html: string } {
  const content = `
    <h2 style="margin:0 0 20px;font-size:22px;color:#1c1917;font-weight:normal;">Welcome to Lyne Tilt Studio</h2>
    <p style="margin:0 0 20px;">Hi ${firstName},</p>
    <p style="margin:0 0 20px;">Thank you for creating an account with Lyne Tilt Studio. With your new account, you can see your orders, save payment and shipping information, and check out faster.</p>
    <p style="margin:0 0 30px;text-align:center;">
      <a href="${FRONTEND_URL}/#/shop" style="display:inline-block;background-color:#1c1917;color:#ffffff;padding:16px 32px;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;font-weight:bold;">Visit Our Site</a>
    </p>
    <p style="margin:0;font-style:italic;color:#8d3038;">Thanks,<br>Lyne Tilt Studio</p>
  `;

  return {
    subject: `Welcome to Lyne Tilt Studio, ${firstName}!`,
    html: wrapInTemplate(content),
  };
}

export function generatePasswordResetEmail(firstName: string, resetToken: string): { subject: string; html: string } {
  const resetUrl = `${FRONTEND_URL}/#/reset-password?token=${resetToken}`;

  const content = `
    <h2 style="margin:0 0 20px;font-size:22px;color:#1c1917;font-weight:normal;">Reset Your Password</h2>
    <p style="margin:0 0 20px;">Hi ${firstName},</p>
    <p style="margin:0 0 20px;">We received a request to reset your password. Click the button below to create a new password.</p>
    <p style="margin:0 0 30px;text-align:center;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#1c1917;color:#ffffff;padding:16px 32px;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;font-weight:bold;">Reset Password</a>
    </p>
    <p style="margin:0 0 10px;font-size:14px;color:#78716c;">This link will expire in 1 hour.</p>
    <p style="margin:0;font-size:14px;color:#78716c;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
  `;

  return {
    subject: 'Lyne Tilt Studio - Reset your password',
    html: wrapInTemplate(content),
  };
}

export async function sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<boolean> {
  const { subject, html } = generateVerificationEmail(firstName, verificationToken);
  return sendEmail({ to: email, subject, html });
}

export async function sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
  const { subject, html } = generateWelcomeEmail(firstName);
  return sendEmail({ to: email, subject, html });
}

export async function sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean> {
  const { subject, html } = generatePasswordResetEmail(firstName, resetToken);
  return sendEmail({ to: email, subject, html });
}
