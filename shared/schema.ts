import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums as const objects
export const Role = {
  STUDENT: "STUDENT",
  LIBRARIAN: "LIBRARIAN", 
  ADMIN: "ADMIN"
} as const;

export const TransactionStatus = {
  BORROWED: "BORROWED",
  RETURNED: "RETURNED",
  OVERDUE: "OVERDUE"
} as const;

export type Role = typeof Role[keyof typeof Role];
export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: varchar("username").notNull().unique(),
  email: varchar("email").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  studentId: varchar("student_id"),
  passwordHash: varchar("password_hash").notNull(),
  role: varchar("role").$type<Role>().notNull().default("STUDENT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Books table
export const books = pgTable("books", {
  id: varchar("id").primaryKey(),
  title: varchar("title").notNull(),
  author: varchar("author").notNull(),
  isbn: varchar("isbn"),
  category: varchar("category").notNull(),
  description: text("description"),
  publisher: varchar("publisher"),
  totalCopies: integer("total_copies").notNull(),
  availableCopies: integer("available_copies").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  bookId: varchar("book_id").notNull().references(() => books.id),
  borrowedDate: timestamp("borrowed_date").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  returnedDate: timestamp("returned_date"),
  status: varchar("status").$type<TransactionStatus>().notNull().default("BORROWED"),
});

// Inferred types
export type User = typeof users.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  availableCopies: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  borrowedDate: true,
  returnedDate: true,
  status: true,
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Extended types for queries with relations
export type TransactionWithBook = Transaction & {
  book: Book;
};

export type TransactionWithUserAndBook = Transaction & {
  user: User;
  book: Book;
};