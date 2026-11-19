// Bounded batches keep the additive release fast over a remote SQL connection.
export async function insertSchoolRows(run,table,columns,rows,{postgres=false,ignore=false}={}){
 if(!/^[a-z_][a-z0-9_]*$/u.test(table)||columns.some(column=>!/^[a-z_][a-z0-9_]*$/u.test(column)))throw Error('Invalid catalog identifier');
 for(let offset=0;offset<rows.length;offset+=100){
  const batch=rows.slice(offset,offset+100);if(batch.some(row=>row.length!==columns.length))throw Error('Invalid catalog row');
  await run(`INSERT ${ignore&&!postgres?'IGNORE ':''}INTO ${table} (${columns.join(',')}) VALUES ${batch.map(()=>`(${columns.map(()=>'?').join(',')})`).join(',')}${ignore&&postgres?' ON CONFLICT DO NOTHING':''}`,batch.flat());
 }
}
