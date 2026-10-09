/**
 * Outgoing email (password-reset links). Works with any SMTP mailbox, for example a Hostinger email:
 *   SMTP_HOST=smtp.hostinger.com  SMTP_PORT=465  SMTP_USER=no-reply@yourdomain.com  SMTP_PASS=...  MAIL_FROM="USAII <no-reply@yourdomain.com>"
 * Without SMTP settings, email features stay off and the app says "contact your instructor" instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { DATA_DIR } from './db';

/** MAIL_OUTBOX=1 (local testing): emails are written to data/outbox.jsonl instead of being sent. */
const outbox = () => process.env.MAIL_OUTBOX === '1';
export const emailEnabled = () => outbox() || !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transport: nodemailer.Transporter | null = null;
function mailer() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15_000,
    });
  }
  return transport;
}

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (!emailEnabled()) return false;
  if (outbox()) {
    fs.appendFileSync(path.join(DATA_DIR, 'outbox.jsonl'), JSON.stringify({ to, subject, text, at: new Date().toISOString() }) + '\n');
    return true;
  }
  try {
    await mailer().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
    return true;
  } catch (e) {
    console.warn('[mail] could not send:', (e as Error).message);
    return false;
  }
}
