ALTER TABLE ttnava_stage.profiles
 DROP CONSTRAINT IF EXISTS profiles_avatar_key_check,
 DROP CONSTRAINT IF EXISTS chk_profiles_avatar_key;

ALTER TABLE ttnava_stage.profiles ALTER COLUMN avatar_key DROP DEFAULT;
ALTER TABLE ttnava_stage.profiles ALTER COLUMN avatar_key TYPE varchar(32) USING avatar_key::text;
ALTER TABLE ttnava_stage.profiles ALTER COLUMN avatar_key SET DEFAULT 'meo';
ALTER TABLE ttnava_stage.profiles ALTER COLUMN avatar_key SET NOT NULL;
