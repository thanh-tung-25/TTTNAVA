// Shared subject definitions for school student and admin screens.
export const SUBJECTS = [
  ['toan', 'Toán', '🔢'],
  ['tieng-viet', 'Tiếng Việt', '📖'],
  ['tieng-anh', 'Tiếng Anh', '🌍'],
];
export const HIGH_SCHOOL_SUBJECTS=[
  ...SUBJECTS,
  ['vat-li','Vật lí','⚡'],['hoa-hoc','Hóa học','⚗'],['sinh-hoc','Sinh học','🌱'],
  ['lich-su','Lịch sử','🏛'],['dia-li','Địa lí','🌏'],['kinh-te-phap-luat','Giáo dục kinh tế và pháp luật','⚖'],
];
export const SUBJECT_NAMES = Object.fromEntries(HIGH_SCHOOL_SUBJECTS.map(([id,name])=>[id,name]));
export const semesterName=id=>({hk1:'Học kì 1',hk2:'Học kì 2',year:'Cả năm'}[id]||id);
export function subjectName(id,context) {
  const secondary=context?.course?.kind==='secondary'||Number(context?.grade??context)>=6;
  return id==='tieng-viet'&&secondary?'Ngữ văn':SUBJECT_NAMES[id]||id;
}
export function subjectsFor(profile) {
  const highschool=profile?.course?.kind==='highschool'||Number(profile?.grade)>=10;
  return (highschool?HIGH_SCHOOL_SUBJECTS:SUBJECTS).map(([id,,icon])=>[id,subjectName(id,profile),icon]);
}
export function subjectFromSearch(search=window.location.search) {
  const value=new URLSearchParams(search).get('subject');
  return HIGH_SCHOOL_SUBJECTS.some(([id])=>id===value)?value:'toan';
}
