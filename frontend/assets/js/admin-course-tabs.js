const tabs=[...document.querySelectorAll('[data-course-tab]')];
function select(tab){
 if(tab.hidden)return;
 tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});
 document.querySelectorAll('[data-course-panel]').forEach(panel=>panel.hidden=panel.dataset.coursePanel!==tab.dataset.courseTab);
}
tabs.forEach(tab=>{
 tab.onclick=()=>select(tab);
 tab.onkeydown=e=>{const visible=tabs.filter(t=>!t.hidden),index=visible.indexOf(tab);let next;if(e.key==='ArrowRight')next=(index+1)%visible.length;else if(e.key==='ArrowLeft')next=(index+visible.length-1)%visible.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=visible.length-1;else return;e.preventDefault();select(visible[next]);visible[next].focus();};
});
