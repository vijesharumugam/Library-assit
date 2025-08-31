import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["student", "librarian", "admin"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["borrowed", "returned", "overdue"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  studentId: text("student_id"),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn"),
  category: text("category").notNull(),
  description: text("description"),
  publisher: text("publisher"),
  totalCopies: integer("total_copies").notNull(),
  availableCopies: integer("available_copies").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  bookId: varchar("book_id").notNull().references(() => books.id),
  borrowedDate: timestamp("borrowed_date").defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  returnedDate: timestamp("returned_date"),
  status: transactionStatusEnum("status").notNull().default("borrowed"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
}));

export const booksRelations = relations(books, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [transactions.bookId],
    references: [books.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  fullName: true,
  studentId: true,
  password: true,
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  availableCopies: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  borrowedDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
