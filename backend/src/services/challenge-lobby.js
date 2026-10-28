import { ROBOT_ID, ROBOT_LEVELS } from './challenge-robot.js';
import {
  challengeRowsQuery,
  cleanupExpiredInvitations,
  findOpenChallenge,
  summary,
} from './challenge-store.js';

export async function listLobby(profileId) {
  await cleanupExpiredInvitations();
  const incoming = await challengeRowsQuery(
    "c.opponent_id = ? AND c.status = 'pending' AND c.expires_at > UTC_TIMESTAMP(3) ORDER BY c.created_at DESC",
    [profileId],
  );
  const outgoing = await challengeRowsQuery(
    "c.challenger_id = ? AND c.status = 'pending' AND c.expires_at > UTC_TIMESTAMP(3) ORDER BY c.created_at DESC",
    [profileId],
  );
  const recent = await challengeRowsQuery(
    `(c.challenger_id = ? OR c.opponent_id = ?)
     AND c.status IN ('finished', 'cancelled', 'expired')
     ORDER BY c.created_at DESC LIMIT 10`,
    [profileId, profileId],
  );
  const open = await findOpenChallenge(profileId);

  return {
    incoming: incoming.map(summary),
    outgoing: outgoing.map(summary),
    recent: recent.map(summary),
    busy: Boolean(open),
    activeChallengeId: open?.id ?? null,
    robot: {
      id: ROBOT_ID,
      displayName: 'Robot Thách Đấu',
      avatarKey: 'cu',
      levels: Object.keys(ROBOT_LEVELS),
    },
  };
}
