// Convert positional parameters only. SQL dialect changes must remain explicit
// in the services; never interpolate values or rewrite quoted user content.
export function postgresParameters(sql, params = []) {
  let result = '', index = 0;
  for (let i = 0; i < sql.length;) {
    const ch = sql[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      if (quote === '`') throw new Error('Port MySQL quoted identifiers before using PostgreSQL');
      result += sql[i++];
      while (i < sql.length) {
        const current = sql[i++]; result += current;
        if (current === '\\' && i < sql.length) result += sql[i++];
        else if (current === quote) {
          if (sql[i] === quote) result += sql[i++];
          else break;
        }
      }
    } else if (sql.startsWith('--', i) || sql.startsWith('/*', i)) {
      const line = sql.startsWith('--', i);
      const end = sql.indexOf(line ? '\n' : '*/', i + 2);
      const stop = end < 0 ? sql.length : end + (line ? 1 : 2);
      result += sql.slice(i, stop); i = stop;
    } else if (ch === '$') {
      const tag = sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0];
      if (!tag) { result += ch; i++; continue; }
      const end = sql.indexOf(tag, i + tag.length);
      if (end < 0) throw new Error('Unterminated SQL dollar quote');
      result += sql.slice(i, end + tag.length); i = end + tag.length;
    } else if (ch === '?') { result += '$' + (++index); i++; }
    else { result += ch; i++; }
  }
  if (index !== params.length) throw new Error('SQL parameter count mismatch');
  return { text: result, values: params.map(value => typeof value === 'boolean' ? Number(value) : value) };
}

export function mysqlResultShape(result) {
  return result.command === 'SELECT' || result.command === 'SHOW'
    ? result.rows.map(row => {
      for (const key of Object.keys(row)) if (typeof row[key] === 'boolean') row[key] = Number(row[key]);
      return row;
    })
    : { affectedRows: result.rowCount, insertId: result.rows?.[0]?.id, ...(result.rows?.length ? { rows: result.rows } : {}) };
}
