// Swap only the mascot image while speech is playing; respect reduced motion.
export function setMascotSpeaking(root,speaking){
 root.dataset.speaking=String(speaking);
 const moving=speaking&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const image of root.querySelectorAll('img[data-speaking-mascot]')){
  const src='/assets/images/mascot-'+image.dataset.speakingMascot+(moving?'-talking':'')+'.svg';
  if(image.getAttribute('src')!==src)image.setAttribute('src',src);
 }
}
