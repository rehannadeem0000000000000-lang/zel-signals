import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const providerAccounts = pgTable("provider_accounts", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  label: text("label").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  apiKeyHint: text("api_key_hint").notNull(),
  market: text("market").notNull().default(""),
  exchange: text("exchange").notNull().default(""),
  symbol: text("symbol").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiConfigs = pgTable("ai_configs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  baseUrl: text("base_url").notNull().default(""),
  model: text("model").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  apiKeyHint: text("api_key_hint").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyses = pgTable("analyses", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerLabel: text("provider_label").notNull(),
  market: text("market").notNull(),
  exchange: text("exchange").notNull(),
  symbol: text("symbol").notNull(),
  interval: text("interval").notNull(),
  strategies: jsonb("strategies").notNull().$type<string[]>(),
  signal: text("signal").notNull(),
  confidence: integer("confidence").notNull(),
  entry: real("entry"),
  takeProfit: real("take_profit"),
  stopLoss: real("stop_loss"),
  riskReward: real("risk_reward"),
  bullScore: real("bull_score"),
  bearScore: real("bear_score"),
  detail: jsonb("detail").notNull().$type<Record<string, unknown>>(),
  aiBias: text("ai_bias"),
  aiVerdict: text("ai_verdict"),
  aiScore: real("ai_score"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProviderAccount = typeof providerAccounts.$inferSelect;
export type AiConfigRow = typeof aiConfigs.$inferSelect;
export type AnalysisRow = typeof analyses.$inferSelect;
