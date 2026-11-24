ALTER TABLE profiles
 MODIFY COLUMN avatar_key ENUM(
  'meo', 'cho', 'tho', 'gau', 'cao', 'cu', 'ech', 'ga', 'voi', 'khi', 'gau-truc', 'ho',
  'ky-lan', 'khung-long', 'canh-cut', 'gau-koala', 'vet', 'ca-voi', 'cong-chua', 'hoang-tu'
 ) NOT NULL DEFAULT 'meo';
