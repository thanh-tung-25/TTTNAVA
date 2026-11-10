const names={toan:'Toán','tieng-viet':'Tiếng Việt','tieng-anh':'Tiếng Anh',chinese:'Tiếng Trung'};

export function schoolSubjectName(id,grade=0,fallback=''){
 return id==='tieng-viet'&&Number(grade)>=6?'Ngữ văn':fallback||names[id]||id;
}
