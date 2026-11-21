// Capture only the exercise being explicitly reported. Never scrape unrelated
// inputs (login, payment, chat, or other personal fields) from the page.
export function learningFeedbackContext(prompt){
 const practice=prompt.closest('.applied-practice');if(!practice)return prompt.textContent.trim();
 const position=practice.querySelector('.quiz-position')?.textContent.trim(),heading=practice.querySelector('h2')?.textContent.trim();
 const question=practice.querySelector(':scope > .applied-hanzi,:scope > .applied-error,.applied-bubble')?.textContent.trim();
 const input=practice.querySelector('input.quiz-text'),choice=practice.querySelector('.quiz-choices button[aria-pressed="true"]');
 const arranged=practice.querySelector('.applied-sentence');
 const answer=input?input.value:choice?.textContent.trim()||(arranged?.querySelector('button')?arranged.textContent.trim():'');
 const feedback=practice.querySelector('.applied-feedback')?.textContent.trim();
 // Put the submitted value before explanations so it survives the 2,000-char
 // report limit, even if a teacher has written a lengthy correction.
 return [position,heading,question?'Câu hỏi: '+question:'',answer?'Câu trả lời của học sinh: '+answer:'Học sinh chưa nhập/chọn câu trả lời.',feedback?'Kết quả trên màn hình: '+feedback:'Chưa kiểm tra đáp án.'].filter(Boolean).join('\n').slice(0,2000);
}
