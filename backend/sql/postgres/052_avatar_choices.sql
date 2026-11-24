ALTER TABLE ttnava_stage.profiles
 DROP CONSTRAINT IF EXISTS profiles_avatar_key_check,
 ADD CONSTRAINT profiles_avatar_key_check CHECK (avatar_key IN (
  'meo', 'cho', 'tho', 'gau', 'cao', 'cu', 'ech', 'ga', 'voi', 'khi', 'gau-truc', 'ho',
  'ky-lan', 'khung-long', 'canh-cut', 'gau-koala', 'vet', 'ca-voi', 'cong-chua', 'hoang-tu'
 ));
