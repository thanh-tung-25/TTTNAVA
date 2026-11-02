const tabs=[...document.querySelectorAll('[data-course-tab]')];
function select(tab){
 tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});
 document.querySelectorAll('[data-course-panel]').forEach(panel=>panel.hidden=panel.dataset.coursePanel!==tab.dataset.courseTab);
}
tabs.forEach((tab,index)=>{
 tab.onclick=()=>select(tab);
 tab.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();select(tabs[next]);tabs[next].focus();};
});
