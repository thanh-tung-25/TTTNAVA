import { toIso } from './time.js';

export function publicProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    avatarKey: row.avatar_key,
    grade: row.grade === null ? null : Number(row.grade),
    email: row.email,
    locked: Boolean(row.banned_until && new Date(row.banned_until) > new Date()),
    createdAt: toIso(row.created_at),
  };
}

export function publicSubject(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    sortOrder: Number(row.sort_order),
  };
}

export function publicTopic(row) {
  return {
    id: row.id,
    subjectId: row.subject_id,
    grade: Number(row.grade),
    name: row.name,
    slug: row.slug,
    sortOrder: Number(row.sort_order),
    questionCount: row.question_count === undefined ? undefined : Number(row.question_count),
  };
}
