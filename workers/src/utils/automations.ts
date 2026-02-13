import { eq, and } from 'drizzle-orm';
import { emailAutomations, automationQueue } from '../db/schema';
import type { AutomationStep } from '../db/schema';

type DB = any; // DrizzleD1Database type

type TriggerType =
  | 'newsletter_signup'
  | 'purchase'
  | 'coaching_inquiry'
  | 'contact_form'
  | 'manual'
  | 'form_submission_received'
  | 'order_placed'
  | 'order_fulfilled_or_delivered'
  | 'cart_abandoned';

interface TriggerContext {
  customer_first_name?: string;
  order_id?: string;
  order_tracking_number?: string;
  order_tracking_url?: string;
  cart_recovery_url?: string;
  product_name?: string;
  price?: string;
  variant?: string;
  size?: string;
  color?: string;
  qty?: string;
}

function replacePlaceholders(text: string, name: string | undefined, ctx?: TriggerContext): string {
  let result = text;
  result = result.replace(/\{\{name\}\}/g, name || 'there');
  result = result.replace(/\{\{customer_first_name\}\}/g, ctx?.customer_first_name || name || 'there');
  if (ctx) {
    result = result.replace(/\{\{order_id\}\}/g, ctx.order_id || '');
    result = result.replace(/\{\{order_tracking_number\}\}/g, ctx.order_tracking_number || '');
    result = result.replace(/\{\{order_tracking_url\}\}/g, ctx.order_tracking_url || '#');
    result = result.replace(/\{\{cart_recovery_url\}\}/g, ctx.cart_recovery_url || '#');
    result = result.replace(/\{\{product_name\}\}/g, ctx.product_name || '');
    result = result.replace(/\{\{price\}\}/g, ctx.price || '');
    result = result.replace(/\{\{variant\}\}/g, ctx.variant || '');
    result = result.replace(/\{\{size\}\}/g, ctx.size || '');
    result = result.replace(/\{\{color\}\}/g, ctx.color || '');
    result = result.replace(/\{\{qty\}\}/g, ctx.qty || '');
  }
  return result;
}

export async function triggerAutomation(
  db: DB,
  triggerType: TriggerType,
  email: string,
  name?: string,
  ctx?: TriggerContext,
) {
  // Find active, enabled automations matching this trigger
  const activeAutomations = await db.select().from(emailAutomations)
    .where(and(
      eq(emailAutomations.trigger, triggerType),
      eq(emailAutomations.status, 'active'),
      eq(emailAutomations.enabled, true)
    ))
    .all();

  for (const automation of activeAutomations) {
    // Check one-time-per-recipient constraint
    if (automation.oneTimePerRecipient) {
      const existing = await db.select().from(automationQueue)
        .where(and(
          eq(automationQueue.automationId, automation.id),
          eq(automationQueue.recipientEmail, email)
        ))
        .get();
      if (existing) continue;
    }

    const now = new Date();

    // Template-based automation (flat model with subject/bodyText)
    if (automation.subject && automation.bodyText) {
      const delayMs = ((automation.sendDelayDays || 0) * 24 * 60 + (automation.sendDelayHours || 0) * 60) * 60 * 1000;
      const scheduledFor = new Date(now.getTime() + delayMs).toISOString();

      const personalizedSubject = replacePlaceholders(automation.subject, name, ctx);
      const personalizedBody = replacePlaceholders(automation.bodyHtml || automation.bodyText, name, ctx);

      await db.insert(automationQueue).values({
        automationId: automation.id,
        automationName: automation.name,
        stepId: 'template',
        stepOrder: 0,
        recipientEmail: email,
        recipientName: name || null,
        subject: personalizedSubject,
        body: personalizedBody,
        status: 'scheduled',
        scheduledFor,
      });

      continue;
    }

    // Step-based automation (legacy model)
    const steps = (automation.steps || []) as AutomationStep[];
    for (const step of steps) {
      const delayMs = ((step.delayDays || 0) * 24 * 60 + (step.delayHours || 0) * 60) * 60 * 1000;
      const scheduledFor = new Date(now.getTime() + delayMs).toISOString();

      const personalizedSubject = replacePlaceholders(step.subject, name, ctx);
      const personalizedBody = replacePlaceholders(step.body, name, ctx);

      await db.insert(automationQueue).values({
        automationId: automation.id,
        automationName: automation.name,
        stepId: step.id,
        stepOrder: step.order,
        recipientEmail: email,
        recipientName: name || null,
        subject: personalizedSubject,
        body: personalizedBody,
        status: 'scheduled',
        scheduledFor,
      });
    }
  }
}
