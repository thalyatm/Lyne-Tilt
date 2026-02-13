import { eq, and } from 'drizzle-orm';
import { emailAutomations, automationQueue } from '../db/schema';
import type { AutomationStep } from '../db/schema';

type DB = any; // DrizzleD1Database type

type TriggerType = 'newsletter_signup' | 'purchase' | 'coaching_inquiry' | 'contact_form' | 'manual';

export async function triggerAutomation(db: DB, triggerType: TriggerType, email: string, name?: string) {
  // Find active automations matching this trigger
  const activeAutomations = await db.select().from(emailAutomations)
    .where(and(
      eq(emailAutomations.trigger, triggerType),
      eq(emailAutomations.status, 'active')
    ))
    .all();

  for (const automation of activeAutomations) {
    const steps = (automation.steps || []) as AutomationStep[];
    const now = new Date();

    for (const step of steps) {
      // Calculate scheduledFor based on delay
      const delayMs = ((step.delayDays || 0) * 24 * 60 + (step.delayHours || 0) * 60) * 60 * 1000;
      const scheduledFor = new Date(now.getTime() + delayMs).toISOString();

      // Replace {{name}} placeholder in subject and body
      const personalizedSubject = step.subject.replace(/\{\{name\}\}/g, name || 'there');
      const personalizedBody = step.body.replace(/\{\{name\}\}/g, name || 'there');

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
