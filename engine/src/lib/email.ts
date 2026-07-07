// Email channel (outbound) — Resend REST, no SDK. Used by QStash job handlers.

const FROM_DEFAULT = 'Crossline <updates@mail.crosslineapp.com>';

export async function sendEmail(args: {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_UPDATES ?? FROM_DEFAULT,
      to: args.to,
      subject: args.subject,
      text: args.text,
      ...(args.html ? { html: args.html } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}
