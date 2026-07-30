import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  mediumtext,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Lecture sessions - each represents one recorded lecture.
 */
export const lectures = mysqlTable("lectures", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  userId: int("userId").notNull(), // FK to users
  title: varchar("title", { length: 255 }).notNull(),
  topic: text("topic"), // Subject/topic of the lecture
  duration: int("duration").default(0), // Total duration in seconds
  status: mysqlEnum("status", ["active", "ended", "processing"]).default("active").notNull(),
  transcript: mediumtext("transcript"), // Full lecture transcript
  aiSummary: mediumtext("aiSummary"), // AI-generated summary
  aiQuiz: mediumtext("aiQuiz"), // AI-generated quiz JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lecture = typeof lectures.$inferSelect;
export type InsertLecture = typeof lectures.$inferInsert;

/**
 * Confusion moments - each represents a bell press during a session.
 */
export const confusionMoments = mysqlTable("confusion_moments", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  lectureId: varchar("lectureId", { length: 36 }).notNull(), // FK to lectures
  timestamp: int("timestamp").notNull(), // Seconds from session start
  topic: varchar("topic", { length: 255 }), // What the student was confused about
  transcriptContext: mediumtext("transcriptContext"), // Transcript around the confusion point
  audioClipUrl: varchar("audioClipUrl", { length: 512 }), // S3 storage URL for the 30s audio clip
  aiExplanation: mediumtext("aiExplanation"), // AI-generated explanation (JSON)
  status: mysqlEnum("status", ["new", "explained", "reviewed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConfusionMoment = typeof confusionMoments.$inferSelect;
export type InsertConfusionMoment = typeof confusionMoments.$inferInsert;

/**
 * Transcript lines - individual transcription entries for a session.
 */
export const transcripts = mysqlTable("transcripts", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  lectureId: varchar("lectureId", { length: 36 }).notNull(), // FK to lectures
  text: text("text").notNull(),
  timestamp: int("timestamp").notNull(), // Seconds from session start
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transcript = typeof transcripts.$inferSelect;
export type InsertTranscript = typeof transcripts.$inferInsert;

/**
 * Chat messages - for the AI chatbot within sessions.
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  lectureId: varchar("lectureId", { length: 36 }).notNull(), // FK to lectures
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: mediumtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Relations
 */
export const lecturesRelations = relations(lectures, ({ many }) => ({
  confusionMoments: many(confusionMoments),
  transcripts: many(transcripts),
  chatMessages: many(chatMessages),
}));

export const confusionMomentsRelations = relations(confusionMoments, ({ one }) => ({
  lecture: one(lectures, {
    fields: [confusionMoments.lectureId],
    references: [lectures.id],
  }),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  lecture: one(lectures, {
    fields: [transcripts.lectureId],
    references: [lectures.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  lecture: one(lectures, {
    fields: [chatMessages.lectureId],
    references: [lectures.id],
  }),
}));
