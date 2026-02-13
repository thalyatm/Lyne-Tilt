import { Resend } from 'resend';
import type { Bindings } from '../index';

export async function sendEmail(env: Bindings, to: string, subject: string, html: string) {
  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: 'Lyne Tilt <hello@lynetilt.com>',
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
}

export function rewriteLinksForTracking(html: string, sentEmailId: string, subscriberEmail: string, baseUrl: string): string {
  // Rewrite <a href="..."> tags to tracking URLs
  let linkIndex = 0;
  let rewritten = html.replace(/<a\s([^>]*?)href=["']([^"']+)["']/gi, (match, prefix, url) => {
    // Skip mailto: and # links
    if (url.startsWith('mailto:') || url.startsWith('#') || url.startsWith('tel:')) return match;
    const trackUrl = `${baseUrl}/api/newsletter/track/click/${sentEmailId}/${linkIndex}?url=${encodeURIComponent(url)}&email=${encodeURIComponent(subscriberEmail)}`;
    linkIndex++;
    return `<a ${prefix}href="${trackUrl}"`;
  });

  // Replace {{unsubscribe_url}} placeholder
  const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`;
  rewritten = rewritten.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

  // Inject tracking pixel before </body>
  const pixel = `<img src="${baseUrl}/api/newsletter/track/open/${sentEmailId}?email=${encodeURIComponent(subscriberEmail)}" width="1" height="1" style="display:block;width:1px;height:1px;border:0;" alt="" />`;
  if (rewritten.includes('</body>')) {
    rewritten = rewritten.replace('</body>', `${pixel}</body>`);
  } else {
    rewritten += pixel;
  }

  return rewritten;
}

export async function sendBulkNewsletter(
  env: Bindings,
  sentEmailId: string,
  subject: string,
  preheader: string | null,
  bodyHtml: string,
  recipientEmails: string[],
  baseUrl: string
): Promise<{ sent: number; failed: number }> {
  const resend = new Resend(env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  // Inject preheader if provided
  let htmlWithPreheader = bodyHtml;
  if (preheader) {
    const preheaderHtml = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>`;
    if (htmlWithPreheader.includes('<body')) {
      htmlWithPreheader = htmlWithPreheader.replace(/(<body[^>]*>)/i, `$1${preheaderHtml}`);
    } else {
      htmlWithPreheader = preheaderHtml + htmlWithPreheader;
    }
  }

  for (const email of recipientEmails) {
    try {
      const personalizedHtml = rewriteLinksForTracking(htmlWithPreheader, sentEmailId, email, baseUrl);
      await resend.emails.send({
        from: 'Lyne Tilt <hello@lynetilt.com>',
        to: email,
        subject,
        html: personalizedHtml,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send to ${email}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}
