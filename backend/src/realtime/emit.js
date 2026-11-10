let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
}

export function disconnectUser(profileId) {
  if (!ioInstance) return;
  try { ioInstance.in(`user:${profileId}`).disconnectSockets(true); }
  catch { /* Revocation in the database remains authoritative if the local socket adapter has closed. */ }
}

export function emitToUser(profileId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${profileId}`).emit(event, payload);
}

export function emitToUsers(profileIds, event, payload) {
  for (const profileId of new Set(profileIds.filter(Boolean))) {
    emitToUser(profileId, event, payload);
  }
}
