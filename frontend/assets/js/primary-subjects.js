// Shared subject definitions for primary student and admin screens.
export const SUBJECTS = [
  ['toan', 'Toán', '🔢'],
  ['tieng-viet', 'Tiếng Việt', '📖'],
  ['tieng-anh', 'Tiếng Anh', '🌍'],
];
export const SUBJECT_NAMES = Object.fromEntries(SUBJECTS.map(([id,name])=>[id,name]));
export function subjectFromSearch(search=window.location.search) {
  const value=new URLSearchParams(search).get('subject');
  return SUBJECTS.some(([id])=>id===value)?value:'toan';
}
