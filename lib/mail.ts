import "server-only";

/**
 * Transactional email.
 *
 * There is no mail provider wired up yet — Auth.js here is OAuth-only, so the
 * app has never needed one. Rather than block team invites on that, every
 * helper fails soft: with no provider configured it logs and returns false, and
 * the caller carries on. Invites remain usable in the meantime because an
 * invitee who already has an account sees the invitation in their Partner Hub,
 * and the inviter always gets a copy-able link.
 *
 * To go live: set RESEND_API_KEY (+ MAIL_FROM) and fill in `deliver`.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const FROM = process.env.MAIL_FROM ?? "Mythical Mecca <information@mythical-mecca.com>";

export function absoluteUrl(path: string): string {
  if (!APP_URL) return path;
  return `${APP_URL.replace(/\/$/, "")}${path}`;
}

function configured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

async function deliver(msg: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  if (!configured()) {
    console.warn(
      `[mail] no provider configured — skipped "${msg.subject}" to ${msg.to}`
    );
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      console.error(`[mail] send failed (${res.status})`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail] send failed", err);
    return false;
  }
}

/** Invitation to co-manage a partner page. Never throws. */
export async function sendPartnerInvite(o: {
  to: string;
  partnerName: string;
  inviterName: string;
  url: string;
  expiresAt: Date;
}): Promise<boolean> {
  const expires = o.expiresAt.toISOString().slice(0, 10);
  return deliver({
    to: o.to,
    subject: `${o.inviterName} invited you to help manage ${o.partnerName}`,
    text: [
      `${o.inviterName} has invited you to help manage ${o.partnerName} on Mythical Mecca.`,
      "",
      `Accept here: ${o.url}`,
      "",
      `This invitation expires on ${expires}.`,
      "If you weren't expecting this, you can ignore it.",
    ].join("\n"),
  });
}

/** Notification forwarded to the team when a visitor fills out the Contact form. */
export async function sendCollabNotification(o: {
  name: string;
  email: string;
  org?: string;
  message: string;
}): Promise<boolean> {
  const targetEmail = process.env.CONTACT_EMAIL || "information@mythical-mecca.com";
  return deliver({
    to: targetEmail,
    subject: `[Mythical Mecca Contact] New message from ${o.name}`,
    text: [
      `New message received via the mythicalmecca.com contact form:`,
      "",
      `From: ${o.name}`,
      `Email: ${o.email}`,
      o.org ? `Organization: ${o.org}` : null,
      "",
      `Message:`,
      o.message,
      "",
      `---`,
      `Reply directly to: ${o.email}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

