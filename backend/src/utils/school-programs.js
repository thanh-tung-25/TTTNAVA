export const SCHOOL_PROGRAMS=['primary','secondary','highschool'];
export const SCHOOL_RANGES={primary:[1,5],secondary:[6,9],highschool:[10,12]};
export const SCHOOL_SUBJECT_IDS=['toan','tieng-viet','tieng-anh','vat-li','hoa-hoc','sinh-hoc','lich-su','dia-li','kinh-te-phap-luat'];
export const SCHOOL_SEMESTERS=['hk1','hk2','year'];
export const schoolProgramForGrade=grade=>Number(grade)>=10?'highschool':Number(grade)>=6?'secondary':'primary';
export function gradesForProgram(program){const [start,end]=SCHOOL_RANGES[program]||[1,12];return Array.from({length:end-start+1},(_,i)=>start+i);}
export function semesterName(id){return {hk1:'Học kì 1',hk2:'Học kì 2',year:'Cả năm'}[id]||id;}
