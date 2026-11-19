const names={toan:'Toán','tieng-viet':'Tiếng Việt','tieng-anh':'Tiếng Anh','vat-li':'Vật lí','hoa-hoc':'Hóa học','sinh-hoc':'Sinh học','lich-su':'Lịch sử','dia-li':'Địa lí','kinh-te-phap-luat':'Giáo dục kinh tế và pháp luật',chinese:'Tiếng Trung'};

export function schoolSubjectName(id,grade=0,fallback=''){
 return id==='tieng-viet'&&Number(grade)>=6?'Ngữ văn':fallback||names[id]||id;
}
