import { Router } from 'express';
import crypto from 'node:crypto';
import { emailEnabled, sendMail } from '../mailer';
import { nowIso, uid } from '../db';
import {
  clearFailures,
  hashPassword,
  setPassword,
  verifyUnknownUser,
  initials,
  issueToken,
  loginLocked,
  recordFailure,
  requireAuth,
  toPublic,
  validatePassword,
  verifyPassword,
} from '../auth';
import { db, save } from '../db';
import { audit, fail, recordEvent } from '../services';
import { clearMediaCookie, PASSWORD_RULE, setMediaCookie, userForToken } from '../auth';
import { me, wrap } from './util';
import type { LearnMode } from '../../shared/types';

export const authRouter = Router();

const normEmail = (e: unknown) => (typeof e === 'string' ? e.trim().toLowerCase() : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const signupAllowed = () => (process.env.ALLOW_SIGNUP ?? 'true').toLowerCase() !== 'false';

/** Small per-key windows for sign-up and reset requests (spam and email-bombing protection). */
const windows = new Map<string, number[]>();
function allow(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const list = (windows.get(key) ?? []).filter((t) => now - t < ms);
  if (list.length >= max) {
    windows.set(key, list);
    return false;
  }
  list.push(now);
  windows.set(key, list);
  if (windows.size > 20_000) windows.clear();
  return true;
}

/** What the sign-in page can offer on this server. */
authRouter.get('/options', (_req, res) => {
  res.json({ signup: signupAllowed(), emailReset: emailEnabled() });
});

/** A learner creates their own account (then buys courses on Explore Courses). */
authRouter.post(
  '/register',
  wrap((req, res) => {
    if (!signupAllowed()) fail(403, 'New accounts are created by your instructor on this site.');
    const name = String(req.body?.name ?? '').trim().replace(/\s+/g, ' ');
    const email = normEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (name.length < 2 || name.length > 80) fail(400, 'Enter your full name.');
    if (!EMAIL_RE.test(email) || email.length > 200) fail(400, 'Enter a valid email address.');
    const pwErr = validatePassword(password);
    if (pwErr) fail(400, pwErr);
    if (!allow(`signup:${req.ip ?? ''}`, 5, 3_600_000)) fail(429, 'Too many new accounts from this connection. Please try again later.');
    const d = db();
    if (d.users.some((u) => u.email.toLowerCase() === email)) fail(409, 'An account with this email already exists. Sign in, or use "Forgot password?".');
    const user = { id: uid('u'), name, email, role: 'learner' as const, initials: initials(name), active: true, createdAt: nowIso(), onboarded: false, mustChangePassword: false, ...hashPassword(password) };
    d.users.push(user);
    audit(user, 'SIGNUP', `${name} created a learner account.`);
    recordEvent(user.id, 'login');
    save();
    const token = issueToken(user.id);
    setMediaCookie(req, res, token, userForToken(token).exp);
    return { token, user: toPublic(user) };
  }),
);

/**
 * "Forgot password?": emails a one-time link (30 minutes). The answer is the same whether or not the
 * email has an account, so this cannot be used to find out who is registered.
 */
authRouter.post(
  '/forgot',
  wrap(async (req) => {
    const email = normEmail(req.body?.email);
    const generic = { ok: true, message: 'If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder).' };
    if (!emailEnabled()) fail(503, 'Password reset by email is not set up on this site. Please contact your instructor.');
    if (!EMAIL_RE.test(email)) fail(400, 'Enter a valid email address.');
    if (!allow(`forgot-ip:${req.ip ?? ''}`, 10, 3_600_000) || !allow(`forgot:${email}`, 3, 3_600_000)) return generic;
    const user = db().users.find((u) => u.email.toLowerCase() === email && u.active);
    if (!user) return generic;
    const token = crypto.randomBytes(32).toString('base64url');
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExp = new Date(Date.now() + 30 * 60_000).toISOString();
    save();
    const site = (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const link = `${site}/#/reset?token=${token}`;
    await sendMail(
      user.email,
      'Reset your USAII password',
      `Hello ${user.name},\n\nUse this link within 30 minutes to choose a new password:\n${link}\n\nIf you did not ask for this, ignore this email. Your password stays the same.\n\nUSAII`,
      `<p>Hello ${user.name.replace(/[<>&"]/g, '')},</p><p>Use this link within 30 minutes to choose a new password:</p><p><a href="${link}">Choose a new password</a></p><p>If you did not ask for this, ignore this email. Your password stays the same.</p><p>USAII</p>`,
    );
    audit(user, 'PASSWORD_RESET_REQUEST', 'Requested a password reset link.');
    return generic;
  }),
);

/** Set a new password from the emailed link. Every other sign-in ends. */
authRouter.post(
  '/reset',
  wrap((req, res) => {
    const token = String(req.body?.token ?? '');
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!token) fail(400, 'This reset link is not complete. Open the link from the email again.');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = db().users.find((u) => u.resetTokenHash && u.resetTokenHash.length === hash.length && crypto.timingSafeEqual(Buffer.from(u.resetTokenHash), Buffer.from(hash)));
    if (!user || !user.resetTokenExp || Date.parse(user.resetTokenExp) < Date.now()) fail(400, 'This reset link has expired or was already used. Ask for a new one.');
    if (!user!.active) fail(403, 'This account is not active. Please contact your instructor.');
    const pwErr = validatePassword(password);
    if (pwErr) fail(400, pwErr);
    setPassword(user!, password);
    user!.mustChangePassword = false;
    delete user!.resetTokenHash;
    delete user!.resetTokenExp;
    clearFailures(user!.email);
    audit(user!, 'PASSWORD_RESET', 'Password reset from an emailed link.');
    save();
    const t = issueToken(user!.id);
    setMediaCookie(req, res, t, userForToken(t).exp);
    return { token: t, user: toPublic(user!) };
  }),
);

authRouter.post(
  '/login',
  wrap((req, res) => {
    const email = normEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) fail(400, 'Enter your email and password.');
    if (password.length > 256) fail(400, 'That email and password combination did not match.');
    const ip = req.ip ?? '';
    const wait = loginLocked(email, ip);
    if (wait) fail(429, `Too many attempts. Please wait ${wait > 90 ? `${Math.ceil(wait / 60)} minutes` : `${wait} seconds`} and try again.`);
    const user = db().users.find((u) => u.email.toLowerCase() === email);
    if (!user) verifyUnknownUser(password);
    if (!user || !verifyPassword(password, user)) {
      recordFailure(email, ip);
      fail(401, 'That email and password combination did not match.');
    }
    if (!user!.active) fail(403, user!.suspension ? 'Your account is suspended. Please contact your instructor.' : 'This account has been deactivated. Contact your instructor.');
    // The sign-in page has a Learner tab and an Instructor tab. Only after the password is proven
    // do we say which one this account uses (so this never helps anyone guess accounts).
    const wanted = req.body?.role;
    if ((wanted === 'learner' || wanted === 'instructor') && wanted !== user!.role)
      fail(403, user!.role === 'instructor' ? 'This is an instructor account. Choose the Instructor tab to sign in.' : 'This is a learner account. Choose the Learner tab to sign in.');
    clearFailures(email);
    recordEvent(user!.id, 'login');
    const token = issueToken(user!.id);
    setMediaCookie(req, res, token, userForToken(token).exp);
    return { token, user: toPublic(user!) };
  }),
);

// Self-registration is intentionally disabled: accounts are created by an instructor.

/** The password rule, so every screen shows the same wording the server enforces. */
authRouter.get('/password-rule', (_req, res) => res.json({ rule: PASSWORD_RULE }));

authRouter.get('/me', requireAuth, wrap((req) => ({ user: toPublic(me(req)) })));

/** Sign out: the app forgets its token; this clears the media cookie that opens uploaded files. */
authRouter.post('/logout', (req, res) => {
  clearMediaCookie(req, res);
  res.json({ ok: true });
});

authRouter.post(
  '/change-password',
  requireAuth,
  wrap((req, res) => {
    const u = me(req);
    const { current, next } = req.body ?? {};
    if (!u.mustChangePassword && !verifyPassword(String(current ?? ''), u)) fail(400, 'Your current password is incorrect.');
    const err = validatePassword(next);
    if (err) fail(400, err);
    if (verifyPassword(String(next), u)) fail(400, 'Choose a password that is different from your current one.');
    setPassword(u, next);
    u.mustChangePassword = false;
    audit(u, 'CHANGE_PASSWORD', 'Password changed.');
    save();
    // Every other sign-in with the old password has just ended; give this browser a fresh token.
    const token = issueToken(u.id);
    setMediaCookie(req, res, token, userForToken(token).exp);
    return { user: toPublic(u), token };
  }),
);

authRouter.patch(
  '/profile',
  requireAuth,
  wrap((req) => {
    const u = me(req);
    const b = req.body ?? {};
    if (typeof b.name === 'string' && b.name.trim().length >= 2) {
      u.name = b.name.trim().slice(0, 100);
      u.initials = initials(u.name);
    }
    if (typeof b.onboarded === 'boolean') u.onboarded = b.onboarded;
    if (['read', 'watch', 'listen', 'do'].includes(b.learnMode)) u.learnMode = b.learnMode as LearnMode;
    if (b.goal === null) delete u.goal;
    else if (b.goal && typeof b.goal === 'object') {
      u.goal = {
        statement: String(b.goal.statement ?? '').slice(0, 300),
        why: String(b.goal.why ?? '').slice(0, 500),
        minutesPerDay: Math.max(5, Math.min(240, Number(b.goal.minutesPerDay) || 20)),
        daysPerWeek: Math.max(1, Math.min(7, Number(b.goal.daysPerWeek) || 4)),
      };
    }
    save();
    return { user: toPublic(u) };
  }),
);
