/**
 * Unit tests: transcript parsing, caption parsing, language search, password rules, AI helpers,
 * payment signatures and course access, and the 7 → 8 → 9 data upgrades.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Keep test data away from the real data folder.
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'lms-unit-')));

const { parseTranscript, cuesToText, activeCueIndex, formatCueTime, hashText, activityInstructionBlocks, activityInstructionText } = await import('../shared/transcript');
const { LANGUAGES, searchLanguages, suggestedLanguages, languageByCode } = await import('../shared/languages');
const { validatePassword, tempPassword, hashPassword, verifyPassword } = await import('../server/auth');
const { chunkText, extractJson } = await import('../server/ai');
const { seedDatabase, seedPasswords, SEED_ACCOUNTS } = await import('../server/seed');
const { migrateDatabase } = await import('../server/migrate');
const { hasRubric } = await import('../shared/metrics');
const { cuesToVtt } = await import('../shared/transcript');
const { parseYoutubeCaptions, videoRef, sameLang } = await import('../server/captions');
const { verifyStripeSignature, toMinorUnits } = await import('../server/payments');
const { hasCourseAccess } = await import('../server/services');
const { loadDb } = await import('../server/db');
const { clearLessonTextTranscripts } = await import('../server/content/usaiiCourses');
const nodeCrypto = await import('node:crypto');

/* ---------------- Transcripts ---------------- */

test('parses WebVTT and merges captions split mid-sentence', () => {
  const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
Dana has four tasks

2
00:00:03.000 --> 00:00:05.500
in front of her.

3
00:01:02.000 --> 00:01:05.000
<v Dana>The first is a delay notice.</v>`;
  const cues = parseTranscript(vtt);
  assert.equal(cues.length, 2);
  assert.deepEqual(cues[0], { start: 1, text: 'Dana has four tasks in front of her.' });
  assert.equal(cues[1].start, 62);
  assert.equal(cues[1].text, 'The first is a delay notice.');
});

test('parses SRT with comma milliseconds and hours', () => {
  const srt = `1\n01:02:03,500 --> 01:02:05,000\nHello there.\n`;
  assert.deepEqual(parseTranscript(srt), [{ start: 3723, text: 'Hello there.' }]);
});

test('parses [m:ss] timestamped lines and continuation lines', () => {
  const cues = parseTranscript('[0:00] Intro line.\n[0:12] Second line\ncontinues here.\n[1:02:10] Late line.');
  assert.deepEqual(
    cues.map((c) => c.start),
    [0, 12, 3730],
  );
  assert.equal(cues[1].text, 'Second line continues here.');
});

test('plain paragraphs have no times', () => {
  const cues = parseTranscript('First paragraph\nwraps.\n\nSecond paragraph.');
  assert.deepEqual(cues, [{ text: 'First paragraph wraps.' }, { text: 'Second paragraph.' }]);
});

test('empty and whitespace transcripts give no cues', () => {
  assert.deepEqual(parseTranscript(''), []);
  assert.deepEqual(parseTranscript(undefined), []);
  assert.deepEqual(parseTranscript('   \n\n  '), []);
});

test('cuesToText round-trips timing through translation format', () => {
  const cues = parseTranscript('[0:05] A.\n[1:10] B.');
  const text = cuesToText(cues);
  assert.equal(text, '[0:05] A.\n\n[1:10] B.');
  assert.deepEqual(parseTranscript(text), cues);
});

test('active cue follows playback time', () => {
  const cues = parseTranscript('[0:00] a\n[0:10] b\n[0:20] c');
  assert.equal(activeCueIndex(cues, 0), 0);
  assert.equal(activeCueIndex(cues, 9.9), 1); // 0.25 s look-ahead
  assert.equal(activeCueIndex(cues, 15), 1);
  assert.equal(activeCueIndex(cues, 999), 2);
  assert.equal(activeCueIndex(parseTranscript('no times'), 5), -1);
});

test('formatCueTime', () => {
  assert.equal(formatCueTime(5), '0:05');
  assert.equal(formatCueTime(65), '1:05');
  assert.equal(formatCueTime(3725), '1:02:05');
});

test('hashText is stable and changes with content', () => {
  assert.equal(hashText('abc'), hashText('abc'));
  assert.notEqual(hashText('abc'), hashText('abd'));
});

/* ---------------- Activity instructions ---------------- */

test('legacy instructions become paragraphs, never a numbered list', () => {
  const blocks = activityInstructionBlocks({ instructions: ['Step one.', '  ', 'Step two.'] });
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every((b) => b.type === 'paragraph'));
});

test('rich instructions win and empty blocks are hidden from learners', () => {
  const blocks = activityInstructionBlocks({
    instructions: ['old'],
    instructionBlocks: [
      { id: 'a', type: 'paragraph', text: 'Read this.' },
      { id: 'b', type: 'paragraph', text: '' },
      { id: 'c', type: 'image', url: '/uploads/x.png', label: 'Diagram' },
      { id: 'd', type: 'image', url: '' },
      { id: 'e', type: 'list', items: ['one', 'two'], ordered: false },
    ],
  });
  assert.deepEqual(
    blocks.map((b) => b.id),
    ['a', 'c', 'e'],
  );
  assert.match(activityInstructionText({ instructions: [], instructionBlocks: blocks }), /Read this\.\n\n\[Image: Diagram\]\n\n- one\n- two/);
});

test('hasRubric: PDF or legacy criteria', () => {
  const base = { title: 't', instructions: [], fields: [], allowFile: false };
  assert.equal(hasRubric(undefined), false);
  assert.equal(hasRubric(base), false);
  assert.equal(hasRubric({ ...base, rubricPdf: { url: '/uploads/r.pdf', name: 'r.pdf', maxPoints: 20 } }), true);
  assert.equal(hasRubric({ ...base, rubric: [{ id: 'x', label: 'Clear' }] }), true);
});

/* ---------------- Languages ---------------- */

test('language list: all 22 scheduled Indian languages, unique codes, 130+ total', () => {
  const codes = LANGUAGES.map((l) => l.code);
  assert.equal(new Set(codes).size, codes.length, 'duplicate code');
  assert.ok(LANGUAGES.length >= 130, `only ${LANGUAGES.length}`);
  for (const c of ['as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'ks', 'gom', 'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur'])
    assert.ok(languageByCode(c), `missing ${c}`);
});

test('language search works by English name, native script, code, and ignores accents', () => {
  assert.equal(searchLanguages('hindi')[0].code, 'hi');
  assert.equal(searchLanguages('हिन्दी')[0].code, 'hi');
  assert.equal(searchLanguages('ta')[0].code, 'ta');
  assert.ok(searchLanguages('francais').some((l) => l.code === 'fr'));
  assert.ok(searchLanguages('TAMIL').some((l) => l.code === 'ta'));
  assert.deepEqual(searchLanguages('zzzz'), []);
  assert.equal(searchLanguages('').length, LANGUAGES.length);
});

test('suggested languages from the browser', () => {
  assert.deepEqual(
    suggestedLanguages(['hi-IN', 'en-US', 'mr']).map((l) => l.code),
    ['hi', 'mr'],
  );
  assert.deepEqual(
    suggestedLanguages(['zh-TW']).map((l) => l.code),
    ['zh-TW'],
  );
});

/* ---------------- Passwords ---------------- */

test('password rule rejects weak and accepts strong passwords', () => {
  for (const weak of ['short1!A', 'alllowercase1!x', 'ALLUPPERCASE1!X', 'NoNumbersHere!!', 'NoSymbols12345', 'Learner@2026', 'Instructor@2026', 'Aaaaaaaa1!aaaaa'])
    assert.ok(validatePassword(weak), `accepted weak password ${weak}`);
  for (const strong of Object.values(seedPasswords())) assert.equal(validatePassword(strong), null, strong);
  assert.ok(validatePassword(123 as unknown as string));
  assert.ok(validatePassword('A1!a'.repeat(40)));
});

test('generated passwords always meet the rule and differ', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = tempPassword();
    assert.equal(validatePassword(p), null, p);
    seen.add(p);
  }
  assert.equal(seen.size, 200);
});

/* ---------------- AI helpers ---------------- */

test('chunkText keeps paragraphs whole and respects the size limit', () => {
  const paras = Array.from({ length: 40 }, (_, i) => `[${i}:00] ${'word '.repeat(30)}`.trim());
  const chunks = chunkText(paras.join('\n\n'), 1000);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 1000));
  assert.equal(chunks.join('\n\n'), paras.join('\n\n'));
});

test('chunkText splits a single huge paragraph on sentences', () => {
  const big = 'This is a sentence. '.repeat(400);
  const chunks = chunkText(big, 500);
  assert.ok(chunks.length > 10 && chunks.every((c) => c.length <= 500));
});

test('extractJson tolerates code fences and stray text', () => {
  assert.deepEqual(extractJson('Sure!\n```json\n{"points": 4, "maxPoints": 5}\n```'), { points: 4, maxPoints: 5 });
  assert.equal(extractJson('no json here'), null);
  assert.equal(extractJson('{broken'), null);
});

/* ---------------- Data upgrades 7 → 8 → 9 ---------------- */

/** What LMS 5.6 did: copy the lesson paragraphs under each video into its "transcript". */
function fillFromLessonText(d: ReturnType<typeof seedDatabase>) {
  for (const c of d.courses)
    for (const m of c.modules)
      for (const l of m.lessons)
        l.blocks.forEach((b, i) => {
          if (b.type !== 'video') return;
          const paras: string[] = [];
          for (let j = i + 1; j < l.blocks.length && l.blocks[j].type !== 'heading' && l.blocks[j].type !== 'video'; j++)
            if (l.blocks[j].type === 'paragraph' && l.blocks[j].text?.trim()) paras.push(l.blocks[j].text!.trim());
          if (paras.length) b.transcript = paras.join('\n\n');
        });
}

test('migration 7 → 9 rotates only still-published passwords, removes lesson-text transcripts, keeps data', () => {
  const d = seedDatabase();
  d.version = 7;
  fillFromLessonText(d);
  const byId = (id: string) => d.users.find((u) => u.id === id)!;
  Object.assign(byId('u_alex'), hashPassword('Learner@2026'));
  Object.assign(byId('u_instructor'), hashPassword('Instructor@2026'));
  Object.assign(byId('u_jordan'), hashPassword('MyOwn!Passw0rd99'));
  Object.assign(byId('u_morgan'), hashPassword('Learner@2026'));
  const videos = d.courses[0].modules[0].lessons[0].blocks.filter((b) => b.type === 'video');
  assert.ok((videos[0].transcript ?? '').length > 200, 'precondition: 5.6-style lesson-text transcript');
  // An instructor's own captions on another video must survive.
  const own = d.courses[1].modules[0].lessons[0].blocks.find((b) => b.type === 'video')!;
  own.transcript = '[0:00] Hello and welcome.';
  d.enrollments.push({ id: 'e1', userId: 'u_alex', courseId: d.courses[0].id, enrolledAt: new Date().toISOString(), lessons: {} });
  delete d.transcriptTranslations;
  delete d.payments;

  assert.equal(migrateDatabase(d), true);
  const pw = seedPasswords();
  assert.ok(verifyPassword(pw.u_alex, byId('u_alex')));
  assert.ok(verifyPassword(pw.u_instructor, byId('u_instructor')));
  assert.ok(verifyPassword(pw.u_morgan, byId('u_morgan')));
  assert.ok(byId('u_alex').passwordChangedAt);
  assert.ok(verifyPassword('MyOwn!Passw0rd99', byId('u_jordan')), 'a password the user chose must be kept');
  assert.equal(byId('u_jordan').passwordChangedAt, undefined);
  assert.equal(videos[0].transcript, undefined, 'lesson text is no longer a transcript');
  assert.equal(own.transcript, '[0:00] Hello and welcome.', 'instructor captions kept');
  assert.equal(d.enrollments.length, 1, 'learner data kept');
  assert.deepEqual(d.transcriptTranslations, {});
  assert.deepEqual(d.payments, []);
});

test('migration 8 → 9 works on its own', () => {
  const d = seedDatabase();
  d.version = 8;
  fillFromLessonText(d);
  assert.equal(migrateDatabase(d), true);
  const videos = d.courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.flatMap((l) => l.blocks.filter((b) => b.type === 'video'))));
  assert.ok(videos.every((v) => !v.transcript));
});

test('migration refuses formats older than 7', () => {
  const d = seedDatabase();
  d.version = 6;
  assert.equal(migrateDatabase(d), false);
});

test('fresh seed: no video carries lesson text as a transcript; every account has a strong password', () => {
  const d = seedDatabase();
  const videos = d.courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.flatMap((l) => l.blocks.filter((b) => b.type === 'video'))));
  assert.equal(videos.length, 25);
  assert.ok(videos.every((v) => !v.transcript));
  assert.equal(clearLessonTextTranscripts(d.courses[0]), 0);
  const pw = seedPasswords();
  for (const a of SEED_ACCOUNTS) assert.ok(verifyPassword(pw[a.id], d.users.find((u) => u.id === a.id)!));
});

/* ---------------- Video captions ---------------- */

test('YouTube captions: all three download formats become timed cues, entities decoded', () => {
  const f3 = '<timedtext format="3"><body><p t="0" d="1500">Hello &amp; welcome</p><p t="2500" d="900">to the course.</p><p t="61000" d="900"><s>Next</s> part.</p></body></timedtext>';
  assert.deepEqual(parseYoutubeCaptions(f3), [
    { start: 0, text: 'Hello & welcome to the course.' },
    { start: 61, text: 'Next part.' },
  ]);
  const f1 = '<transcript><text start="1.5" dur="2">It&#39;s here.</text><text start="4" dur="2">Done.</text></transcript>';
  assert.deepEqual(parseYoutubeCaptions(f1), [
    { start: 1.5, text: "It's here." },
    { start: 4, text: 'Done.' },
  ]);
  const j3 = JSON.stringify({ events: [{ tStartMs: 1000, segs: [{ utf8: 'One ' }, { utf8: 'line.' }] }, { tStartMs: 3000 }] });
  assert.deepEqual(parseYoutubeCaptions(j3), [{ start: 1, text: 'One line.' }]);
  assert.deepEqual(parseYoutubeCaptions('<html>blocked</html>'), []);
});

test('video links are recognised', () => {
  assert.deepEqual(videoRef('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), { provider: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(videoRef('https://youtu.be/dQw4w9WgXcQ'), { provider: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(videoRef('https://youtube.com/shorts/dQw4w9WgXcQ'), { provider: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(videoRef('https://vimeo.com/123456789/abcdef'), { provider: 'vimeo', id: '123456789' });
  assert.deepEqual(videoRef('https://player.vimeo.com/video/123456789'), { provider: 'vimeo', id: '123456789' });
  assert.equal(videoRef('/uploads/lesson.mp4').provider, 'file');
  assert.ok(sameLang('en', 'en-US') && sameLang('pt-BR', 'pt') && !sameLang('hi', 'en'));
});

test('captions become a WebVTT track for uploaded videos', () => {
  const vtt = cuesToVtt([{ start: 0, text: 'Hi.' }, { start: 3.25, text: 'A --> B' }, { text: 'untimed' }]);
  assert.equal(vtt, 'WEBVTT\n\n00:00:00.000 --> 00:00:03.250\nHi.\n\n00:00:03.250 --> 00:00:09.250\nA → B\n');
  assert.deepEqual(parseTranscript(vtt).map((c) => c.start), [0, 3], 'round-trips (the parser keeps whole seconds)');
});

/* ---------------- Payments and course access ---------------- */

test('Stripe webhook signature: valid, tampered, wrong secret, and too old', () => {
  const secret = 'whsec_test';
  const raw = Buffer.from('{"type":"checkout.session.completed"}');
  const t = Math.floor(Date.now() / 1000);
  const sig = nodeCrypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  assert.equal(verifyStripeSignature(raw, `t=${t},v1=${sig}`, secret), true);
  assert.equal(verifyStripeSignature(Buffer.from('{"type":"x"}'), `t=${t},v1=${sig}`, secret), false);
  assert.equal(verifyStripeSignature(raw, `t=${t},v1=${sig}`, 'whsec_other'), false);
  const old = t - 3600;
  const oldSig = nodeCrypto.createHmac('sha256', secret).update(`${old}.${raw}`).digest('hex');
  assert.equal(verifyStripeSignature(raw, `t=${old},v1=${oldSig}`, secret), false);
  assert.equal(verifyStripeSignature(raw, undefined, secret), false);
});

test('prices are sent to the gateway in the smallest currency unit', () => {
  assert.equal(toMinorUnits(19, 'USD'), 1900);
  assert.equal(toMinorUnits(19.99, 'USD'), 1999);
  assert.equal(toMinorUnits(499, 'INR'), 49900);
  assert.equal(toMinorUnits(1500, 'JPY'), 1500);
});

test('course access: a paid course needs a verified payment or an instructor', () => {
  const d = loadDb(seedDatabase);
  const course = { ...d.courses[0], price: 19 };
  const free = { ...d.courses[0], price: 0 };
  const base = { id: 'e', userId: 'u_alex', courseId: course.id, enrolledAt: '', lessons: {} };
  assert.equal(hasCourseAccess(undefined, course), false);
  assert.equal(hasCourseAccess(base, course), false, 'pre-5.7 self-enrollment on a paid course stays locked');
  assert.equal(hasCourseAccess(base, free), true);
  assert.equal(hasCourseAccess({ ...base, access: 'free' }, course), true, 'joined while it was free');
  assert.equal(hasCourseAccess({ ...base, grantedBy: 'u_instructor' }, course), true);
  assert.equal(hasCourseAccess({ ...base, access: 'paid' }, course), false, 'paid without a payment record');
  d.payments = [{ id: 'pay1', userId: 'u_alex', courseId: course.id, provider: 'razorpay', amount: 1900, currency: 'USD', status: 'created', orderRef: 'o1', createdAt: '' }];
  assert.equal(hasCourseAccess({ ...base, access: 'paid', paymentId: 'pay1' }, course), false, 'payment not completed');
  d.payments[0].status = 'paid';
  assert.equal(hasCourseAccess({ ...base, access: 'paid', paymentId: 'pay1' }, course), true);
  assert.equal(hasCourseAccess({ ...base, userId: 'u_morgan', access: 'paid', paymentId: 'pay1' }, course), false, "someone else's payment");
});
