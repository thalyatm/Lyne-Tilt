import { Hono } from 'hono';
import { Resend } from 'resend';
import type { Bindings, Variables } from '../index';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/feedback — public endpoint, no auth required
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { type, message, page, userAgent, timestamp } = body;

    if (!type || !message) {
      return c.json({ error: 'type and message are required' }, 400);
    }

    const isError = type === 'error';
    const subject = isError
      ? `⚠️ Error Report from ${page || 'Unknown page'}`
      : `💡 Suggestion from ${page || 'Unknown page'}`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #292524;">
        <div style="background: ${isError ? '#fef2f2' : '#f0fdf4'}; border-left: 4px solid ${isError ? '#ef4444' : '#22c55e'}; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 4px; font-size: 18px; color: ${isError ? '#991b1b' : '#166534'};">
            ${isError ? 'Error Report' : 'Page Suggestion'}
          </h2>
          <p style="margin: 0; font-size: 13px; color: #78716c;">
            ${new Date(timestamp || Date.now()).toLocaleString('en-AU', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #57534e; width: 100px; vertical-align: top;">Page</td>
            <td style="padding: 8px 12px; color: #292524;">${page || 'Not specified'}</td>
          </tr>
          <tr style="background: #fafaf9;">
            <td style="padding: 8px 12px; font-weight: 600; color: #57534e; vertical-align: top;">Type</td>
            <td style="padding: 8px 12px; color: #292524;">${isError ? '🔴 Error' : '💡 Suggestion'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #57534e; vertical-align: top;">Message</td>
            <td style="padding: 8px 12px; color: #292524; white-space: pre-wrap;">${escapeHtml(message)}</td>
          </tr>
          ${userAgent ? `
          <tr style="background: #fafaf9;">
            <td style="padding: 8px 12px; font-weight: 600; color: #57534e; vertical-align: top;">Browser</td>
            <td style="padding: 8px 12px; color: #a8a29e; font-size: 12px;">${escapeHtml(userAgent)}</td>
          </tr>
          ` : ''}
        </table>

        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a8a29e; text-align: center;">
          Sent from Lyne Tilt website feedback system
        </p>
      </div>
    `;

    const resend = new Resend(c.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from: 'Lyne Tilt Feedback <onboarding@resend.dev>',
      to: 'thalya@verdantlabs.com.au',
      subject,
      html,
    });
    if (sendError) throw new Error(sendError.message);

    return c.json({ success: true });
  } catch (err: any) {
    console.error('Feedback send error:', err);
    return c.json({ error: 'Failed to send feedback' }, 500);
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const feedbackRoutes = app;
