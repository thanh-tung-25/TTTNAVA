import {mountChineseDictionary} from './chinese-dictionary.js';
import {studentNavigation,setupStudentNavigation} from './student-navigation.js';

// Original sample vocabulary for the local UI preview; no student data or API.
const samples=[
 ['你','nǐ','bạn'],['好','hǎo','tốt; khỏe'],['你好','nǐ hǎo','xin chào'],['我','wǒ','tôi; mình'],['爱','ài','yêu'],
 ['他','tā','anh ấy; cậu ấy'],['她','tā','cô ấy'],['你们','nǐmen','các bạn'],['我们','wǒmen','chúng tôi; chúng ta'],
 ['学','xué','học'],['生','shēng','sinh; sống'],['学生','xuésheng','học sinh'],['老','lǎo','già; lâu năm'],['师','shī','thầy; người có chuyên môn'],['老师','lǎoshī','giáo viên'],['学校','xuéxiào','trường học'],
 ['中','zhōng','giữa; trung tâm'],['文','wén','văn; chữ viết'],['中文','zhōngwén','tiếng Trung'],['汉','hàn','Hán'],['字','zì','chữ'],['汉字','hànzì','chữ Hán'],['中国','Zhōngguó','Trung Quốc'],
 ['人','rén','người'],['大','dà','to; lớn'],['小','xiǎo','nhỏ'],['日','rì','ngày; mặt trời'],['月','yuè','tháng; mặt trăng'],['水','shuǐ','nước'],['火','huǒ','lửa'],['山','shān','núi'],['木','mù','cây; gỗ'],['口','kǒu','miệng'],['天','tiān','trời; ngày'],['书','shū','sách'],['手','shǒu','tay'],['心','xīn','tim; lòng'],
 ['是','shì','là'],['不','bù','không'],['有','yǒu','có'],['吗','ma','trợ từ dùng ở cuối câu hỏi'],['妈','mā','mẹ'],['马','mǎ','ngựa'],['朋友','péngyou','bạn bè'],['上','shàng','trên; lên'],['下','xià','dưới; xuống'],['一','yī','một'],['二','èr','hai'],['三','sān','ba'],['十','shí','mười'],['年','nián','năm']
];
const examples={你好:['你好！','nǐ hǎo!','Xin chào!'],老师:['他是老师。','tā shì lǎoshī.','Anh ấy là giáo viên.'],学生:['我是学生。','wǒ shì xuésheng.','Tôi là học sinh.'],学:['我学中文。','wǒ xué zhōngwén.','Tôi học tiếng Trung.']};
const bank={course:{id:'local-preview',title:'Từ mẫu để xem thử'},count:samples.length,words:samples.map(([hanzi,pinyin,meaning],i)=>({id:'preview-'+i,hanzi,pinyin,meaning,favorite:false,lessons:[],example:examples[hanzi]?.[0]||'',example_pinyin:examples[hanzi]?.[1]||'',example_meaning:examples[hanzi]?.[2]||''}))};
function localAudio(text,{label='Nghe',compact=false}={}){
 const wrap=document.createElement('div');wrap.className='question-audio';
 const button=document.createElement('button');button.type='button';button.textContent=compact?'🔊':label;button.setAttribute('aria-label',label);button.title=label;
 button.onclick=()=>{
  const voice=window.speechSynthesis?.getVoices().find(item=>item.localService&&/^zh(?:-|_)/i.test(item.lang));
  if(!voice){button.title='Thiết bị chưa có giọng tiếng Trung cục bộ.';button.textContent='🔇';document.querySelector('.dictionary-status').textContent='Thiết bị chưa có giọng tiếng Trung cục bộ để nghe. Pinyin và nghĩa vẫn hiển thị bên dưới.';return;}
  window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=voice.lang;utterance.voice=voice;utterance.rate=.8;window.speechSynthesis.speak(utterance);
 };
 wrap.append(button);return wrap;
}
const profile={displayName:'Góc xem thử',course:{...bank.course,title:'Tiếng Trung HSK 1',kind:'chinese',level:1}};
document.getElementById('preview-navigation').innerHTML=studentNavigation('chinese',profile);
setupStudentNavigation(document.getElementById('app-header'),profile);
mountChineseDictionary(profile,{initialBank:bank,readOnly:true,renderAudio:localAudio});
document.getElementById('preview-start').onclick=()=>{
 document.getElementById('chinese-dictionary-open').click();
 const toggle=document.querySelector('.dictionary-handwriting-toggle');if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();
};
document.getElementById('preview-help').onclick=()=>{const guide=document.getElementById('preview-guide');guide.open=true;guide.scrollIntoView({behavior:'smooth',block:'center'});};
