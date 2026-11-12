// Keep the persisted "owl" choice compatible while displaying the new lion.
export function companionVisual(animal,name){
 const key=animal==='owl'?'lion':animal;
 const displayName=animal==='owl'&&name==='Cú nhỏ'?'Sư tử nhỏ':name;
 return {image:'/assets/images/mascot-'+(key||'lion')+'.svg',name:displayName||({lion:'Sư tử nhỏ',panda:'Gấu trúc',bunny:'Thỏ nhỏ'}[key]||'Sư tử nhỏ')};
}
