import { ident } from './postgres-snapshot-schema.mjs';

export function runtimeParityPlan(manifest, schema = 'ttnava_stage') {
  if (!manifest.complete) throw Error('Complete source metadata required');
  const full = table => ident(schema) + '.' + ident(table);
  const columns = manifest.columns.filter(column => /on update current_timestamp/i.test(column.extra));
  if (columns.some(column => column.name !== 'updated_at')) throw Error('Unexpected automatic timestamp column');
  const sql = [];
  if (columns.length) {
    sql.push(`CREATE OR REPLACE FUNCTION ${full('touch_updated_at')}() RETURNS trigger
      LANGUAGE plpgsql SET search_path=pg_catalog AS $body$
      BEGIN
        IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at AND NEW IS DISTINCT FROM OLD THEN
          NEW.updated_at = statement_timestamp();
        END IF;
        RETURN NEW;
      END;
      $body$`);
    sql.push(`REVOKE ALL ON FUNCTION ${full('touch_updated_at')}() FROM PUBLIC,anon,authenticated`);
    for (const column of columns) sql.push(`CREATE OR REPLACE TRIGGER ttnava_touch_updated_at BEFORE UPDATE ON ${full(column.tableName)} FOR EACH ROW EXECUTE FUNCTION ${full('touch_updated_at')}()`);
  }
  if (manifest.tables.some(table => table.name === 'profiles')) {
    for (const column of ['username', 'email']) sql.push(`CREATE UNIQUE INDEX IF NOT EXISTS ${ident('profiles_casefold_' + column)} ON ${full('profiles')} (lower(${ident(column)}))`);
  }
  return { sql, timestampTables: columns.map(column => column.tableName) };
}
