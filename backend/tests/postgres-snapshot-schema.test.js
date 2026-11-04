import {it,expect} from 'vitest';
import {enumValues,ident,isJsonColumn,pgType,schemaPlan,utcTimestamp} from '../scripts/lib/postgres-snapshot-schema.mjs';

const col=(overrides={})=>({tableName:'example',name:'id',dataType:'int',columnType:'int(10) unsigned',isNullable:'NO',defaultValue:null,extra:'',...overrides});
const manifest={complete:true,tables:[{name:'example',primaryKey:['id']}],columns:[col()],checks:[],keys:[],indexes:[],foreignKeyRules:[]};
it('compares UTC timestamps from both databases without losing milliseconds',()=>{
  expect(utcTimestamp('2026-11-03 15:30:01.123')).toBe('2026-11-03T15:30:01.123Z');
  expect(utcTimestamp('2026-11-03 15:30:01.123+00')).toBe('2026-11-03T15:30:01.123Z');
  expect(utcTimestamp('2026-11-03 22:30:01.123+07:00')).toBe('2026-11-03T15:30:01.123Z');
});

it('keeps unsigned integers, precise decimals, UTC timestamps and binary files representable',()=>{
  expect(pgType(manifest,col())).toBe('bigint');
  expect(pgType(manifest,col({dataType:'decimal',columnType:'decimal(5,2)'}))).toBe('numeric(5,2)');
  expect(pgType(manifest,col({dataType:'datetime',columnType:'datetime(3)'}))).toBe('timestamptz(3)');
  expect(pgType(manifest,col({dataType:'longblob',columnType:'longblob'}))).toBe('bytea');
  expect(()=>pgType(manifest,col({dataType:'geometry'}))).toThrow();
});
it('recognizes JSON checks only on their original table',()=>{
  const m={...manifest,checks:[{tableName:'other',expression:'json_valid(`data`)'}]};
  const c=col({name:'data',dataType:'longtext',columnType:'longtext'});
  expect(isJsonColumn(m,c)).toBe(false);
  expect(isJsonColumn({...m,checks:[{tableName:'example',expression:'json_valid(`data`)'}]},c)).toBe(true);
});
it('parses enum values without evaluating SQL or losing escaped apostrophes',()=>{
  expect(enumValues("enum('draft','published','can\\'t')")).toEqual(['draft','published',"can't"]);
  expect(()=>enumValues("enum('draft',CURRENT_USER)")).toThrow();
  expect(()=>ident('example; DROP SCHEMA public')).toThrow();
});
it('creates an isolated schema with primary keys and restrictive RLS grants',()=>{
  const p=schemaPlan(manifest);
  expect(p.before[0]).toBe('CREATE SCHEMA "ttnava_stage"');
  expect(p.before.join('\n')).toContain('PRIMARY KEY ("id")');
  expect(p.before.join('\n')).toContain('REVOKE ALL ON SCHEMA');
  expect(p.security).toContain('ALTER TABLE "ttnava_stage"."example" ENABLE ROW LEVEL SECURITY');
  expect(p.security.join('\n')).toContain('FROM PUBLIC,anon,authenticated');
});
it('refuses incomplete snapshots and defaults requiring manual conversion',()=>{
  expect(()=>schemaPlan({...manifest,complete:false})).toThrow();
  expect(()=>schemaPlan({...manifest,columns:[col({defaultValue:'unsupported_function()'})]})).toThrow();
});
