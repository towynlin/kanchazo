import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export const teamRoleEnum = pgEnum("team_role", ["parent", "coach"]);
export const eventKindEnum = pgEnum("event_kind", ["game", "practice"]);
export const eventStatusEnum = pgEnum("event_status", ["scheduled", "cancelled"]);
export const availabilityStatusEnum = pgEnum("availability_status", ["yes", "no", "maybe"]);
export const inviteRoleEnum = pgEnum("invite_role", ["parent", "coach"]);

// ──────────────────────────────────────────────
// Users & auth
// ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull().unique(), // E.164, unique
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passkeys = pgTable("passkeys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(), // base64url-encoded COSE key
  signCount: integer("sign_count").notNull().default(0),
  deviceName: text("device_name"), // user-supplied label
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(), // sha256(opaque cookie value)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_token_hash_idx").on(t.tokenHash)],
);

export const magicTokens = pgTable(
  "magic_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(), // E.164
    tokenHash: text("token_hash").notNull().unique(), // sha256(raw token)
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("magic_tokens_phone_idx").on(t.phone)],
);

// ──────────────────────────────────────────────
// Teams & membership
// ──────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  timeZone: text("time_zone").notNull().default("America/New_York"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamRoleEnum("role").notNull().default("parent"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("team_memberships_team_user_unique").on(t.teamId, t.userId)],
);

// ──────────────────────────────────────────────
// Players & guardians
// ──────────────────────────────────────────────

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playerGuardians = pgTable(
  "player_guardians",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [unique("player_guardians_player_user_unique").on(t.playerId, t.userId)],
);

// ──────────────────────────────────────────────
// Events & availability
// ──────────────────────────────────────────────

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  kind: eventKindEnum("kind").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  location: text("location").notNull(),
  opponentName: text("opponent_name"), // game only
  isHome: boolean("is_home"), // game only
  notes: text("notes"),
  notesUpdatedAt: timestamp("notes_updated_at", { withTimezone: true }),
  notesEditorId: uuid("notes_editor_id").references(() => users.id, { onDelete: "set null" }),
  status: eventStatusEnum("status").notNull().default("scheduled"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const availability = pgTable(
  "availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: availabilityStatusEnum("status").notNull().default("maybe"),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("availability_event_player_unique").on(t.eventId, t.playerId)],
);

// ──────────────────────────────────────────────
// Chat
// ──────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatReads = pgTable(
  "chat_reads",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    lastReadMessageId: uuid("last_read_message_id").references(() => chatMessages.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("chat_reads_user_team_unique").on(t.userId, t.teamId)],
);

// ──────────────────────────────────────────────
// Invitations
// ──────────────────────────────────────────────

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }), // null = admin issuing coach-of-new-team
  inviterUserId: uuid("inviter_user_id").references(() => users.id, {
    onDelete: "set null",
  }), // null = system admin CLI
  invitedRole: inviteRoleEnum("invited_role").notNull(),
  contactPhone: text("contact_phone"), // E.164
  contactEmail: text("contact_email"),
  intendedPlayerIds: uuid("intended_player_ids").array(), // for parent invites
  tokenHash: text("token_hash").notNull().unique(), // sha256(raw token)
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedByUserId: uuid("used_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────
// Audit log
// ──────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g. "event.create", "event.cancel", "member.remove"
  target: text("target"), // e.g. "event:uuid", "user:uuid"
  payload: text("payload"), // JSON string
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────
// iCal read-only tokens
// ──────────────────────────────────────────────

export const icalTokens = pgTable("ical_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────
// Push subscriptions
// ──────────────────────────────────────────────

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("push_subscriptions_endpoint_unique").on(t.endpoint)],
);

// ──────────────────────────────────────────────
// Inferred types
// ──────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMembership = typeof teamMemberships.$inferSelect;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Availability = typeof availability.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type MagicToken = typeof magicTokens.$inferSelect;
