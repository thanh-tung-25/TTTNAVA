import { ident } from './postgres-snapshot-schema.mjs';
export function platformTables(schema = 'ttnava_stage') {
  const full = name => ident(schema) + '.' + ident(name);
  return [
    `CREATE TABLE IF NOT EXISTS ${full('file_assets')} (asset_key varchar(220) PRIMARY KEY,object_key varchar(500) NOT NULL,sha256 char(64) NOT NULL,byte_size integer NOT NULL CHECK(byte_size>0 AND byte_size<=20971520),mime_type varchar(120) NOT NULL,filename varchar(255) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS ${full('request_limits')} (key_hash char(64) PRIMARY KEY,hits integer NOT NULL,reset_at timestamptz NOT NULL)`,
    ...['file_assets', 'request_limits'].flatMap(table => [
      `ALTER TABLE ${full(table)} ENABLE ROW LEVEL SECURITY`,
      `REVOKE ALL ON TABLE ${full(table)} FROM PUBLIC,anon,authenticated`,
    ]),
  ];
}
