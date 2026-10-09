/**
 * Upgrades a saved database to the current format without losing learners' work.
 *
 * 7 → 8 (LMS 5.6):
 *  - The four starter accounts move from the old published passwords to strong ones. Only an account
 *    whose password is STILL the old published one is changed; a password someone already changed is kept.
 *    Changing it also ends any sign-in made with the old password.
 *  - The shared cache for transcript translations is created.
 *
 * 8 → 9 (LMS 5.7):
 *  - Video "transcripts" that 5.6 copied from the lesson text are removed. Transcripts now come from
 *    each video's own captions. Transcripts an instructor added themselves are kept.
 *  - Payment records are created. Learners who joined a PAID course without paying keep their
 *    progress, but the course stays locked until they pay or an instructor gives access.
 */
import type { Database } from '../shared/types';
import { hashPassword, verifyPassword } from './auth';
import { clearLessonTextTranscripts, USAII_COURSE_IDS } from './content/usaiiCourses';
import { SEED_ACCOUNTS, seedPasswords } from './seed';

const OLD_PUBLISHED = { instructor: 'Instructor@2026', learner: 'Learner@2026' };

export function migrateDatabase(d: Database): boolean {
  if (d.version !== 7 && d.version !== 8) return false;
  if (d.version === 7) {
    const pw = seedPasswords();
    const now = new Date().toISOString();
    let rotated = 0;
    for (const a of SEED_ACCOUNTS) {
      const u = d.users.find((x) => x.id === a.id && x.email.toLowerCase() === a.email);
      if (!u) continue;
      if (verifyPassword(OLD_PUBLISHED[a.role], u)) {
        Object.assign(u, hashPassword(pw[a.id]), { passwordChangedAt: now });
        rotated += 1;
      }
    }
    d.transcriptTranslations ??= {};
    d.version = 8;
    console.log(`[migrate] 7 → 8: ${rotated} starter password(s) replaced with strong ones.`);
  }
  // 8 → 9 (LMS 5.7): transcripts are the video's own captions; payments are recorded.
  let cleared = 0;
  for (const c of d.courses) if (USAII_COURSE_IDS.has(c.id)) cleared += clearLessonTextTranscripts(c);
  // Translations made from that lesson text are no longer the video's words.
  d.transcriptTranslations = {};
  d.videoCaptions ??= {};
  d.payments ??= [];
  console.log(`[migrate] 8 → 9: ${cleared} video transcript(s) that were copied from lesson text removed; payments enabled.`);
  return true;
}
