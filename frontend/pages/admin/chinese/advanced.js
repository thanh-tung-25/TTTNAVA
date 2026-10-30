import {initPage} from '/assets/js/ui-core.js';
import {request,el,root,link,card,field,statuses,table,formSubmit,error,notice,button} from '/assets/js/chinese-common.js';
const params=new URLSearchParams(location.search);let data;
const adminLink=(text,p)=>link(text,p,'admin');
const setOptions=()=>data.sets.map(s=>[s.id,`HSK ${s.level_id} / ${s.lesson_title} / ${s.title}`]);
async function boot(){
 await initPage('admin','chinese');data=await request('/catalog');notice('');
 document.querySelector('#chinese-nav').append(adminLink('Bài học',{}),el('a',{href:'/pages/admin/students/?program=chinese',text:'Học sinh Tiếng Trung'}),adminLink('Tiến độ',{view:'progress'}));
 if(params.get('view')==='levels')return levels();return tests();
}
function levels(){for(const l of data.levels){const f=el('form',{},[field('Tên cấp','title',l.title),field('Mô tả','description',l.description,'textarea')]);root().append(card(`HSK ${l.id}`,[formSubmit(f,d=>request('/levels/'+l.id,'PUT',d))]));}}

async function tests(){const rows=await request('/tests');root().append(table(['Tên','Nguồn','Trạng thái','Sửa'],rows.map(t=>[t.title,t.set_ids.map(id=>data.sets.find(s=>s.id===id)?.title||id).join(', '),t.status,adminLink('Sửa',{view:'tests',test:t.id})])));
 const t=rows.find(t=>t.id===params.get('test'));const f=el('form',{},[field('Tên bài kiểm tra','title',t?.title),field('Thời gian (giây, trống = không giới hạn)','duration_seconds',t?.duration_seconds,'number'),field('Phần trăm đạt','pass_percent',t?.pass_percent||70,'number'),field('Trạng thái','status',t?.status||'draft','text',statuses)]);
 const sources=el('fieldset',{},[el('legend',{text:'Chọn rõ các bộ nguồn (câu hỏi theo thứ tự bộ và thứ tự trong bộ)'})]);for(const [id,label]of setOptions()){const input=el('input',{type:'checkbox',value:id});input.checked=t?.set_ids.includes(id)||false;sources.append(el('label',{class:'chinese-field'},[input,label]));}f.append(sources);
 root().append(card(t?'Sửa bài kiểm tra':'Tạo bài kiểm tra',[formSubmit(f,async d=>{d.set_ids=[...sources.querySelectorAll('input:checked')].map(i=>i.value);d.duration_seconds=d.duration_seconds?Number(d.duration_seconds):null;await request('/tests'+(t?'/'+t.id:''),t?'PUT':'POST',d);location.href='?view=tests';})]));
 if(t)root().append(button('Xóa bài kiểm tra',async()=>{if(!confirm(`Xóa bài kiểm tra “${t.title}”? Lịch sử làm bài vẫn được giữ. Không thể hoàn tác.`))return;await request('/tests/'+t.id,'DELETE');location.href='?view=tests';}));
}

boot().catch(error);
