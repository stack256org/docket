import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { emailTemplates } from "@/db/schema";
import { db } from "@/lib/db";
import { emailBrand, emailStyles } from "@/lib/email/components/layout";
import { richTextToHtml, richTextToPlainText } from "@/lib/rich-text";

export type EmailTemplateType =
  | "ticket_created"
  | "ticket_replied"
  | "ticket_closed"
  | "my_tickets_list";

interface MergeTag {
  description: string;
  tag: string;
}

interface EmailTemplateMeta {
  defaultBody: string;
  defaultSubject: string;
  description: string;
  /** True for emails enqueued with `category: "ticket"` in lib/email — these stop sending, and the admin UI locks their editor, when `ticket_email_notifications_enabled` is off. */
  gatedByTicketToggle: boolean;
  label: string;
  mergeTags: MergeTag[];
  type: EmailTemplateType;
}

// Single source of truth for what's customizable and what each email's
// merge tags are — drives both the admin UI's reference panel and the
// preview endpoint's sample data.
export const EMAIL_TEMPLATE_TYPES: EmailTemplateMeta[] = [
  {
    type: "ticket_created",
    label: "Ticket Created",
    description: "Sent to the customer right after they submit a ticket.",
    defaultSubject:
      "[#{{ticketNumber}}] Your ticket has been received — {{ticketSubject}}",
    gatedByTicketToggle: true,
    defaultBody: `Hi {{customerName}},

Your support ticket #{{ticketNumber}} has been received. Our team will review it and get back to you as soon as possible.

Subject: {{ticketSubject}}

View your ticket: {{ticketUrl}}

You can also find all your tickets here: {{myTicketsUrl}}`,
    mergeTags: [
      { tag: "customerName", description: "Customer's name" },
      { tag: "ticketNumber", description: "e.g. 1042" },
      { tag: "ticketSubject", description: "The ticket's subject line" },
      { tag: "ticketUrl", description: "Link to view the ticket" },
      {
        tag: "myTicketsUrl",
        description: "Link to the customer's ticket list",
      },
      { tag: "brandName", description: "Your configured brand name" },
    ],
  },
  {
    type: "ticket_replied",
    label: "Agent Replied",
    description: "Sent to the customer when an agent posts a public reply.",
    defaultSubject:
      "[#{{ticketNumber}}] New reply on your ticket — {{ticketSubject}}",
    gatedByTicketToggle: true,
    defaultBody: `Hi {{customerName}},

{{agentName}} has replied to your ticket #{{ticketNumber}}.

Subject: {{ticketSubject}}

{{replyPreview}}

View your ticket and reply: {{ticketUrl}}`,
    mergeTags: [
      { tag: "customerName", description: "Customer's name" },
      { tag: "ticketNumber", description: "e.g. 1042" },
      { tag: "ticketSubject", description: "The ticket's subject line" },
      {
        tag: "agentName",
        description: "The replying agent's name — omit this tag to hide it",
      },
      {
        tag: "replyPreview",
        description: "The first ~500 characters of the reply",
      },
      { tag: "ticketUrl", description: "Link to view the ticket" },
      { tag: "brandName", description: "Your configured brand name" },
    ],
  },
  {
    type: "ticket_closed",
    label: "Ticket Closed",
    description: "Sent to the customer when their ticket is closed.",
    defaultSubject:
      "[#{{ticketNumber}}] Your ticket has been closed — {{ticketSubject}}",
    gatedByTicketToggle: true,
    defaultBody: `Hi {{customerName}},

Your support ticket #{{ticketNumber}} has been marked as closed.

Subject: {{ticketSubject}}

If you still need help, you can reopen the ticket here: {{ticketUrl}}`,
    mergeTags: [
      { tag: "customerName", description: "Customer's name" },
      { tag: "ticketNumber", description: "e.g. 1042" },
      { tag: "ticketSubject", description: "The ticket's subject line" },
      { tag: "ticketUrl", description: "Link to view (and reopen) the ticket" },
      { tag: "brandName", description: "Your configured brand name" },
    ],
  },
  {
    type: "my_tickets_list",
    label: "My Tickets List",
    description: "Sent when a customer asks to find their tickets by email.",
    defaultSubject: "Your support tickets",
    gatedByTicketToggle: false,
    defaultBody: `Here's a secure link to view all {{ticketCount}} of your tickets.

View my tickets: {{listUrl}}

This link expires in 7 days.`,
    mergeTags: [
      { tag: "listUrl", description: "Link to the customer's ticket list" },
      { tag: "ticketCount", description: "How many open tickets they have" },
      { tag: "brandName", description: "Your configured brand name" },
    ],
  },
];

export function getEmailTemplateMeta(
  type: EmailTemplateType
): EmailTemplateMeta {
  const meta = EMAIL_TEMPLATE_TYPES.find((t) => t.type === type);
  if (!meta) {
    throw new Error(`Unknown email template type: ${type}`);
  }
  return meta;
}

export type EmailTemplateRow = typeof emailTemplates.$inferSelect;

export async function getEmailTemplate(
  type: EmailTemplateType
): Promise<EmailTemplateRow | undefined> {
  const [row] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.type, type))
    .limit(1);
  return row;
}

export async function getAllEmailTemplates(): Promise<
  Record<EmailTemplateType, EmailTemplateRow | undefined>
> {
  const rows = await db.select().from(emailTemplates);
  const byType = new Map(rows.map((r) => [r.type, r]));
  return Object.fromEntries(
    EMAIL_TEMPLATE_TYPES.map((t) => [t.type, byType.get(t.type)])
  ) as Record<EmailTemplateType, EmailTemplateRow | undefined>;
}

/** Upsert a type's subject/body. Passing `null` for a field resets it to the built-in default. */
export async function setEmailTemplate(
  type: EmailTemplateType,
  fields: { subject?: string | null; body?: string | null }
): Promise<EmailTemplateRow> {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.type, type))
    .limit(1);

  const subject =
    fields.subject === undefined ? (existing?.subject ?? null) : fields.subject;
  const body =
    fields.body === undefined ? (existing?.body ?? null) : fields.body;

  const [row] = await db
    .insert(emailTemplates)
    .values({
      id: createId(),
      type,
      subject,
      body,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: emailTemplates.type,
      set: { subject, body, updatedAt: now },
    })
    .returning();
  return row;
}

/** Replace every `{{tag}}` occurrence found in `vars`; unrecognized tags are left as-is. */
export function substituteTags(
  input: string,
  vars: Record<string, string>
): string {
  return input.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.hasOwn(vars, key) ? vars[key] : match
  );
}

function renderShell({
  brandName,
  logoUrl,
  bodyHtml,
}: {
  brandName: string;
  logoUrl: string | null;
  bodyHtml: string;
}): string {
  const header = logoUrl
    ? `<img src="${logoUrl}" alt="${brandName}" height="32" style="display:block;margin-bottom:24px;border:none;" />`
    : `<p style="font-weight:900;letter-spacing:0;margin:0 0 24px;color:${emailBrand.bark};font-size:16px;">${brandName}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:${emailBrand.surface};font-family:${emailStyles.body.fontFamily};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${emailBrand.surface};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:${emailBrand.white};border:1px solid ${emailBrand.cream};border-radius:10px;">
          <tr>
            <td style="padding:32px;">
              ${header}
              <div style="color:${emailBrand.bark};font-size:15px;line-height:24px;">${bodyHtml}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface RenderCustomEmailResult {
  html: string;
  subject: string;
  text: string;
}

function renderTemplate({
  subject,
  body,
  vars,
  brandName,
  logoUrl,
}: {
  subject: string;
  body: string;
  vars: Record<string, string>;
  brandName: string;
  logoUrl: string | null;
}): RenderCustomEmailResult {
  const allVars = { ...vars, brandName };
  return {
    subject: substituteTags(subject, allVars),
    html: renderShell({
      brandName,
      logoUrl,
      bodyHtml: substituteTags(richTextToHtml(body), allVars),
    }),
    text: substituteTags(richTextToPlainText(body), allVars),
  };
}

/**
 * Renders a customized email for `type` if an admin has saved one, else
 * returns null so the caller falls back to its existing hardcoded template.
 * `vars` supplies every merge tag value for this specific send (stringified
 * already — e.g. ticketNumber as "1042").
 */
export async function renderCustomEmail({
  type,
  vars,
  brandName,
  logoUrl,
}: {
  type: EmailTemplateType;
  vars: Record<string, string>;
  brandName: string;
  logoUrl: string | null;
}): Promise<RenderCustomEmailResult | null> {
  const row = await getEmailTemplate(type);
  // A custom body is what actually activates the custom render path — the
  // default body only exists as hardcoded JSX in each template file, which
  // this function has no access to render, so a subject-only customization
  // isn't enough on its own. Subject falls back to the default text if left
  // blank even once a custom body exists.
  if (!row?.body) {
    return null;
  }

  const meta = getEmailTemplateMeta(type);
  return renderTemplate({
    subject: row.subject ?? meta.defaultSubject,
    body: row.body,
    vars,
    brandName,
    logoUrl,
  });
}

const SAMPLE_VARS: Record<EmailTemplateType, Record<string, string>> = {
  ticket_created: {
    customerName: "Jane Doe",
    ticketNumber: "1042",
    ticketSubject: "Cannot log in",
    ticketUrl: "https://support.example.com/ticket/cku1a2b3c4d5e6f?token=...",
    myTicketsUrl: "https://support.example.com/my-tickets",
  },
  ticket_replied: {
    customerName: "Jane Doe",
    ticketNumber: "1042",
    ticketSubject: "Cannot log in",
    agentName: "Alex",
    replyPreview: "Thanks for reaching out — looking into this now.",
    ticketUrl: "https://support.example.com/ticket/cku1a2b3c4d5e6f?token=...",
  },
  ticket_closed: {
    customerName: "Jane Doe",
    ticketNumber: "1042",
    ticketSubject: "Cannot log in",
    ticketUrl: "https://support.example.com/ticket/cku1a2b3c4d5e6f?token=...",
  },
  my_tickets_list: {
    listUrl: "https://support.example.com/my-tickets/abc123",
    ticketCount: "3",
  },
};

/**
 * Renders unsaved edits (from the admin UI's editor, not the DB) against
 * fixed sample data, for the "Preview" button. `subject`/`body` fall back to
 * the type's default subject / an empty body when not yet filled in.
 */
export function renderEmailPreview({
  type,
  subject,
  body,
  brandName,
  logoUrl,
}: {
  type: EmailTemplateType;
  subject: string | null;
  body: string;
  brandName: string;
  logoUrl: string | null;
}): RenderCustomEmailResult {
  const meta = getEmailTemplateMeta(type);
  return renderTemplate({
    subject: subject?.trim() ? subject : meta.defaultSubject,
    body,
    vars: SAMPLE_VARS[type],
    brandName,
    logoUrl,
  });
}
