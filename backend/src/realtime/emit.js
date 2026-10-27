let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
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
