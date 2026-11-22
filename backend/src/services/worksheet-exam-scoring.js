// Three-part science paper: choice/short answers 0.25, a four-statement
// true/false question 0 / 0.1 / 0.25 / 0.5 / 1 depending on correct statements.
export function worksheetExamScore(items,results,config={}){
 if(config.scoring==='school-points'){
  let points=0,total=0;
  for(const item of items){if(item.grading==='excluded')continue;const maximum=item.points||0,result=results.find(row=>row.id===item.id);total+=maximum;const count=result?.checks?.filter(Boolean).length||0;points+=item.type==='true_false_group'?maximum*(item.config.scoring==='thpt-2025'?[0,.1,.25,.5,1][count]:count/item.config.statements.length):result?.correct===true?maximum:0;}
  return {points:Math.round(points*1000)/1000,maximum:Math.round(total*1000)/1000,percent:total?Math.round(points/total*10000)/100:0};
 }
 let points=0,total=0;
 for(const item of items){if(item.grading==='excluded')continue;const result=results.find(row=>row.id===item.id);const maximum=item.type==='true_false_group'?1:['fill','word'].includes(item.type)?config.short_points||.25:.25;total+=maximum;points+=item.type==='true_false_group'?[0,.1,.25,.5,1][result?.checks?.filter(Boolean).length||0]:result?.correct===true?maximum:0;}
 return {points:Math.round(points*100)/100,maximum:Math.round(total*100)/100,percent:total?Math.round(points/total*10000)/100:0};
}
