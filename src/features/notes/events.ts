export const NOTE_EVENTS = {
  CREATE: "notes:create",
  OPEN:   "notes:open",
  DELETE: "notes:delete",
  UPDATE: "notes:update",
} as const;

export const SYNC_EVENTS = {
  NOTE_FLUSHED:  "notes:flushed",
  NOTE_DELETED:  "notes:deleted",
  NOTE_PINNED:   "notes:pinned",
  NOTE_ARCHIVED: "notes:archived",
} as const;