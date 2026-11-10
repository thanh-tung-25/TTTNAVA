// Shared subject definitions for school student and admin screens.
export const SUBJECTS = [
  ['toan', 'Toán', '🔢'],
  ['tieng-viet', 'Tiếng Việt', '📖'],
  ['tieng-anh', 'Tiếng Anh', '🌍'],
];
export const SUBJECT_NAMES = Object.fromEntries(SUBJECTS.map(([id,name])=>[id,name]));
export function subjectName(id,context) {
  const secondary=context?.course?.kind==='secondary'||Number(context?.grade??context)>=6;
  return id==='tieng-viet'&&secondary?'Ngữ văn':SUBJECT_NAMES[id]||id;
}
export function subjectsFor(profile) {
  return profile?.course?.kind==='secondary'
    ? SUBJECTS.map(([id,,icon])=>[id,subjectName(id,profile),icon])
    : SUBJECTS;
}
export function subjectFromSearch(search=window.location.search) {
  const value=new URLSearchParams(search).get('subject');
  return SUBJECTS.some(([id])=>id===value)?value:'toan';
}
