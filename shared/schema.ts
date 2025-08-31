import { z } from "zod";
import { pgTable, varchar, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Define enums
export const roleEnum = pgEnum('role', ['STUDENT', 'LIBRARIAN', 'ADMIN']);
export const transactionStatusEnum = pgEnum('transaction_status', ['BORROWED', 'RETURNED', 'OVERDUE']);

// Define tables
export const users = pgTable('users', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: varchar('username').notNull().unique(),
  email: varchar('email').notNull().unique(),
  fullName: varchar('full_name').notNull(),
  studentId: varchar('student_id'),
  password: varchar('password').notNull(),
  role: roleEnum('role').notNull().default('STUDENT'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const books = pgTable('books', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: varchar('title').notNull(),
  author: varchar('author').notNull(),
  isbn: varchar('isbn'),
  category: varchar('category').notNull(),
  description: text('description'),
  publisher: varchar('publisher'),
  totalCopies: integer('total_copies').notNull(),
  availableCopies: integer('available_copies').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id').notNull(),
  bookId: varchar('book_id').notNull(),
  borrowedDate: timestamp('borrowed_date').defaultNow().notNull(),
  dueDate: timestamp('due_date').notNull(),
  returnedDate: timestamp('returned_date'),
  status: transactionStatusEnum('status').notNull().default('BORROWED'),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
}));

export const booksRelations = relations(books, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  book: one(books, { fields: [transactions.bookId], references: [books.id] }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;

// Export enums as types
export type Role = 'STUDENT' | 'LIBRARIAN' | 'ADMIN';
export type TransactionStatus = 'BORROWED' | 'RETURNED' | 'OVERDUE';

// Export enum values for runtime use
export const Role = {
  STUDENT: 'STUDENT' as const,
  LIBRARIAN: 'LIBRARIAN' as const,
  ADMIN: 'ADMIN' as const,
};

export const TransactionStatus = {
  BORROWED: 'BORROWED' as const,
  RETURNED: 'RETURNED' as const,
  OVERDUE: 'OVERDUE' as const,
};

// Input validation schemas using Drizzle-Zod
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).omit({ id: true, createdAt: true });

export const insertBookSchema = createInsertSchema(books, {
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  category: z.string().min(1, "Category is required"),
  totalCopies: z.number().min(1, "At least 1 copy is required"),
}).omit({ id: true, createdAt: true, availableCopies: true });

export const insertTransactionSchema = createInsertSchema(transactions, {
  userId: z.string(),
  bookId: z.string(),
  dueDate: z.date(),
}).omit({ id: true, borrowedDate: true });

// Inferred types
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