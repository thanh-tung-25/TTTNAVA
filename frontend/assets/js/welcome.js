const toggle=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#site-navigation');
function closeMenu(restoreFocus=false){
 if(!toggle||!navigation)return;
 toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Mở menu');navigation.dataset.open='false';
 if(restoreFocus)toggle.focus();
}
toggle?.addEventListener('click',()=>{
 const open=toggle.getAttribute('aria-expanded')!=='true';
 toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Đóng menu':'Mở menu');navigation.dataset.open=String(open);
});
navigation?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true')closeMenu(true);});
matchMedia('(min-width:761px)').addEventListener('change',()=>closeMenu());
const word=document.querySelector('.word-flip');
word?.addEventListener('click',()=>{
 const flipped=word.getAttribute('aria-pressed')!=='true';word.setAttribute('aria-pressed',String(flipped));
 word.setAttribute('aria-label',flipped?'Lật lại thẻ từ Xin chào':'Lật thẻ từ 你好');
 word.querySelector('.word-front').setAttribute('aria-hidden',String(flipped));word.querySelector('.word-back').setAttribute('aria-hidden',String(!flipped));
 document.getElementById('word-feedback').textContent=flipped?'你好 — Xin chào. Nǐ hǎo.':'Mặt trước thẻ: 你好.';
});
