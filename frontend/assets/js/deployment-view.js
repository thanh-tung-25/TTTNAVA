import {api,el} from './api.js';
import {initPage} from './ui-core.js';
const out=document.querySelector('#deployment-results'),notice=document.querySelector('#support-notice');
async function check(){notice.textContent='Đang kiểm tra…';try{
 const data=(await api('/api/v1/admin/deployment-check')).data;let build=null;
 try{const response=await fetch('/assets/build-info.json',{cache:'no-store'});if(response.ok)build=await response.json();}catch{}
 const matches=build?build.release===data.release:data.release==='local';
 out.replaceChildren(el('section',{class:'support-card'},[el('h2',{text:data.ready&&matches?'Sẵn sàng về cấu hình':'Cần cập nhật trước khi sử dụng'}),el('p',{text:'Backend: '+data.release}),el('p',{text:'Giao diện: '+(build?.release||(data.release==='local'?'local':'Chưa đọc được thông tin bản dựng'))}),el('p',{text:'Kết nối: '+data.database}),el('p',{text:data.note})]),el('section',{class:'support-card'},[el('h2',{text:'Các bảng bắt buộc'}),...data.tables.map(t=>el('p',{text:(t.ready?'✓ ':'⚠ ')+t.name}))]));notice.textContent=matches?'Đã kiểm tra.':'Giao diện và backend chưa xác nhận cùng phiên bản. Kiểm tra deployment và tải lại trang.';
 }catch(e){notice.textContent=e.message;}}
document.querySelector('#deployment-refresh').onclick=check;initPage('admin','deployment').then(check).catch(e=>notice.textContent=e.message);
