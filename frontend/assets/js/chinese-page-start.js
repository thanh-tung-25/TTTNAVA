// Apply route layout before the first paint, without waiting for login/API data
// or the study module graph. This controls presentation only, never access.
{
 const params=new URLSearchParams(location.search),view=params.get('view');
 const lessonView=!['ai-chat','street'].includes(view);
 document.body.classList.toggle('is-studying',lessonView&&(params.has('set')||params.has('attempt')));
 document.body.classList.toggle('is-speaking',lessonView&&params.get('mode')==='speak');
}
