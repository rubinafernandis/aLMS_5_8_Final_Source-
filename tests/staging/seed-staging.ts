/**
 * Builds a staging data folder for the persona focus groups.
 * Usage: tsx tests/staging/seed-staging.ts <staging-dir> <video-file> <rubric-pdf>
 *
 * Accounts (all password STAGING_PW): see ACCOUNTS below. Evidence profiles follow
 * alms-review/05-Focus-Group-Test-Targets.md and tests/adaptivity.test.ts, dated relative to now.
 */
import fs from 'node:fs';
import path from 'node:path';

const [dir, videoSrc, pdfSrc] = process.argv.slice(2);
fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
process.chdir(dir);

const { seedDatabase } = await import('../../server/seed');
const { hashPassword, initials } = await import('../../server/auth');
const { flattenLessons, emptyProgress } = await import('../../shared/analytics');
const { buildItems } = await import('../../shared/metrics');
import type { ActivityEvent, Course, Database, Enrollment, Payment, UserRecord } from '../../shared/types';

export const STAGING_PW = 'Stag1ng!Persona-2026';
const DAY = 86_400_000;
const NOW = Date.now();
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const d: Database = seedDatabase();
d.payments = [];

// ---- Media: a real lesson video with captions, and a rubric PDF ----
fs.copyFileSync(videoSrc, path.join('uploads', 'stg-worked-example.webm'));
fs.copyFileSync(pdfSrc, path.join('uploads', 'stg-rubric.pdf'));
const CAPTIONS = [
  [0, 'Meet Dana, an operations manager at a logistics company.'],
  [3, 'She has four tasks in front of her this morning.'],
  [6, 'Before she reaches for AI, she sorts them by kind of job.'],
  [9, 'A delay notice to a client is a language job.'],
  [12, 'The fuel surcharge needs her own invoice data.'],
  [15, 'So she uses AI only where it actually fits.'],
].map(([s, t]) => `00:00:${String(s).padStart(2, '0')}.000 --> 00:00:${String((s as number) + 3).padStart(2, '0')}.000\n${t}`);

const course = d.courses.find((c) => c.id === 'c_ai_fluency')!;
course.status = 'published';
course.price = 19;
course.priceSet = true;
for (const m of course.modules)
  for (const l of m.lessons) {
    if (l.activity) l.activity.rubricPdf = { url: '/uploads/stg-rubric.pdf', name: 'Activity rubric.pdf', maxPoints: 20 };
    const v = l.blocks.find((b) => b.type === 'video');
    if (v && l.id === 'af-d1') {
      v.url = '/uploads/stg-worked-example.webm';
      v.label = 'Worked example: Dana sorts her morning';
      v.transcript = `WEBVTT\n\n${CAPTIONS.join('\n\n')}`;
    }
  }
// A second published course so Explore has something to buy.
const other = d.courses.find((c) => c.id === 'c_prompt_context')!;
other.status = 'published';
other.price = 29;
other.priceSet = true;

const flat = flattenLessons(course);

interface Spec {
  done: number;
  check: (i: number) => number;
  rubric?: (i: number) => number | null;
  studyDays: number[];
  inProgress?: boolean;
  startDaysAgo?: number;
}

function enrollmentFor(userId: string, c: Course, spec: Spec): { enr: Enrollment; events: ActivityEvent[] } {
  const lessons: Enrollment['lessons'] = {};
  const start = spec.startDaysAgo ?? 20;
  flattenLessons(c)
    .slice(0, spec.done)
    .forEach((f, i) => {
      const p = emptyProgress();
      p.status = 'done';
      p.startedAt = iso(start - i * 1.5);
      p.completedAt = iso(start - i * 1.5 - 0.2);
      p.activeSeconds = 2400 + i * 120;
      const qs = f.lesson.check;
      if (qs.length) {
        const right = Math.round((spec.check(i) / 100) * qs.length);
        const answers = qs.map((q, k) => (k < right ? q.correctIndex : (q.correctIndex + 1) % q.options.length));
        p.attempts.push({ at: p.completedAt!, score: Math.round((right / qs.length) * 100), answers, kind: 'check', items: buildItems(qs, answers, () => f.lesson.id) });
      }
      if (f.lesson.activity) {
        const pts = spec.rubric?.(i) ?? null;
        p.activity = { fields: { response: 'My work for this activity.' }, submittedAt: p.completedAt!, review: pts === null ? undefined : 'approved' } as any;
        if (pts !== null) p.activity!.rubric = { scores: [], points: pts, maxPoints: 20, percent: Math.round((pts / 20) * 100), scoredBy: 'Elena Novak', scoredAt: p.completedAt! };
      }
      lessons[f.lesson.id] = p;
    });
  if (spec.inProgress && flat[spec.done]) {
    const p = emptyProgress();
    p.status = 'in_progress';
    p.startedAt = iso(Math.min(...spec.studyDays));
    lessons[flat[spec.done].lesson.id] = p;
  }
  const payId = `pay_stg_${userId}`;
  const pay: Payment = { id: payId, userId, courseId: c.id, provider: 'razorpay', amount: 1900, currency: 'USD', status: 'paid', orderRef: `order_stg_${userId}`, paymentRef: `pay_${userId}`, createdAt: iso(start + 1), paidAt: iso(start + 1) };
  d.payments!.push(pay);
  const enr: Enrollment = { id: `enr_${userId}`, userId, courseId: c.id, enrolledAt: iso(start + 1), access: 'paid', paymentId: payId, lessons };
  const events: ActivityEvent[] = spec.studyDays.flatMap((dd, i) => [
    { id: `ev_${userId}_l${i}`, userId, type: 'login' as const, at: iso(dd) },
    { id: `ev_${userId}_s${i}`, userId, courseId: c.id, type: 'study' as const, at: iso(dd), seconds: 1800 },
  ]);
  return { enr, events };
}

const goal = (statement: string, minutesPerDay = 30, daysPerWeek = 4) => ({ statement, why: 'It matters for my work.', minutesPerDay, daysPerWeek });
function addLearner(id: string, name: string, email: string, spec: Spec | null, extra: Partial<UserRecord> = {}) {
  const u: UserRecord = {
    id,
    name,
    email,
    role: 'learner',
    initials: initials(name),
    active: true,
    createdAt: iso(25),
    onboarded: true,
    mustChangePassword: false,
    goal: goal('Use AI confidently in my job'),
    ...hashPassword(STAGING_PW),
    ...extra,
  };
  d.users.push(u);
  if (spec) {
    const { enr, events } = enrollmentFor(id, course, spec);
    d.enrollments.push(enr);
    d.events.push(...events);
  }
}

// ---- The seven seeded accounts ----
const A: Spec = { done: 6, check: () => 100, rubric: () => 6, studyDays: [0, 1, 2, 4, 5], inProgress: true };
addLearner('u_acct_a', 'Priya Raman', 'acct-a@staging.usaii.org', A, { goal: goal('Automate parts of my data analysis work', 40, 5) });
addLearner('u_acct_b', 'Dana Ortiz', 'acct-b@staging.usaii.org', { done: 2, check: () => 100, rubric: () => 18, studyDays: [9, 12], startDaysAgo: 14 }, { goal: goal('Finish this credential for my quarterly review', 20, 3) });
addLearner('u_acct_c', 'Marcus Bell', 'acct-c@staging.usaii.org', { done: 6, check: (i) => (i === 2 ? 33 : 100), rubric: () => 17, studyDays: [0, 1, 3, 4], inProgress: true }, { goal: goal('Change careers into an AI-enabled role', 45, 5) });
addLearner('u_acct_d', 'Sam Whitfield', 'acct-d@staging.usaii.org', { done: 1, check: () => 67, rubric: () => null, studyDays: [0], startDaysAgo: 2, inProgress: true }, { goal: goal('Learn the basics of AI at my own pace', 20, 3) });
addLearner('u_acct_e', 'James Holloway', 'acct-e@staging.usaii.org', { done: 10, check: () => 100, rubric: () => 19, studyDays: [0, 1, 2, 3, 4, 5] }, { goal: goal('Earn the credential before my team rollout', 45, 5) });
addLearner('u_acct_f', 'Priya Control', 'acct-f@staging.usaii.org', A, { goal: goal('Automate parts of my data analysis work', 40, 5) });
// G: brand new, has paid, never started, has not set a goal yet.
addLearner('u_acct_g', 'Sam New', 'acct-g@staging.usaii.org', { done: 0, check: () => 0, studyDays: [], startDaysAgo: 0 }, { onboarded: false, goal: undefined });

// ---- Elena's cohort (enterprise learning manager uses the instructor view) ----
const instructor = d.users.find((u) => u.id === 'u_instructor')!;
instructor.name = 'Elena Novak';
instructor.initials = 'EN';
Object.assign(instructor, hashPassword(STAGING_PW));
const cohort: [string, Spec][] = [
  ['Aisha Khan', { done: 8, check: () => 92, rubric: () => 17, studyDays: [0, 1, 2, 3] }],
  ['Ben Carter', { done: 3, check: () => 50, rubric: () => 8, studyDays: [11, 13], startDaysAgo: 16 }],
  ['Chen Wei', { done: 5, check: (i) => (i === 3 ? 40 : 90), rubric: () => 15, studyDays: [1, 2, 4] }],
  ['Diego Alvarez', { done: 7, check: () => 85, rubric: () => 7, studyDays: [0, 2, 3, 6] }],
  ['Emma Schulz', { done: 10, check: () => 95, rubric: () => 18, studyDays: [0, 1, 2] }],
  ['Farah Haddad', { done: 1, check: () => 33, rubric: () => null, studyDays: [8], startDaysAgo: 10 }],
  ['Gopal Iyer', { done: 4, check: () => 80, rubric: () => 14, studyDays: [0, 1, 3] }],
  ['Hana Sato', { done: 6, check: () => 70, rubric: () => 12, studyDays: [5, 6, 9] }],
  ['Ivan Petrov', { done: 2, check: () => 100, rubric: () => 19, studyDays: [15], startDaysAgo: 18 }],
  ['Julia Costa', { done: 9, check: () => 88, rubric: () => 16, studyDays: [0, 1] }],
];
cohort.forEach(([name, spec], i) => addLearner(`u_cohort_${i}`, name, `cohort${i}@staging.usaii.org`, spec));

// A learner who joined the paid course before 5.7 without paying (legacy hole), to check Elena sees it.
d.users.push({ id: 'u_unpaid', name: 'Kofi Mensah', email: 'unpaid@staging.usaii.org', role: 'learner', initials: 'KM', active: true, createdAt: iso(25), onboarded: true, mustChangePassword: false, goal: goal('Learn AI'), ...hashPassword(STAGING_PW) });
d.enrollments.push({ id: 'enr_unpaid', userId: 'u_unpaid', courseId: course.id, enrolledAt: iso(12), lessons: {} });

// Starter demo accounts are not part of the study.
d.enrollments = d.enrollments.filter((e) => !['u_alex', 'u_jordan', 'u_morgan'].includes(e.userId));
fs.writeFileSync(path.join('data', 'db.json'), JSON.stringify(d));
console.log(`Staging seeded: ${d.users.length} users, ${d.enrollments.length} enrollments, ${d.payments!.length} payments.`);
