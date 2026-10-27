-- Robot Thach Dau: tai khoan he thong, khong the dang nhap.
INSERT INTO profiles (
  id, username, email, password_hash, role, display_name, avatar_key, grade, banned_until
) VALUES (
  '00000000-0000-4000-8000-000000000b07',
  'robot_thach_dau',
  'robot_thach_dau@kids-learning.invalid',
  '',
  'bot',
  'Robot Thách Đấu',
  'cu',
  NULL,
  '2999-01-01 00:00:00'
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  avatar_key = VALUES(avatar_key),
  role = 'bot',
  banned_until = '2999-01-01 00:00:00';
