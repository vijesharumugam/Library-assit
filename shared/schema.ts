import { z } from "zod";
import { User, Book, Transaction, BookRequest, Role, TransactionStatus, BookRequestStatus } from "@prisma/client";

// Prisma-generated types
export type { User, Book, Transaction, BookRequest };

// Export enums both as types and runtime values
export { Role, TransactionStatus, BookRequestStatus } from "@prisma/client";

// Input validation schemas
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required"),
  studentId: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertBookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  publisher: z.string().optional(),
  totalCopies: z.number().min(1, "At least 1 copy is required"),
});

export const insertTransactionSchema = z.object({
  userId: z.string(),
  bookId: z.string(),
  dueDate: z.date(),
  status: z.enum(["BORROWED", "RETURNED", "OVERDUE"]).optional(),
});

export const insertBookRequestSchema = z.object({
  userId: z.string(),
  bookId: z.string(),
  requestedBy: z.string(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FULFILLED"]).optional(),
});

// Inferred types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertBookRequest = z.infer<typeof insertBookRequestSchema>;

// Extended types for queries with relations
export type TransactionWithBook = Transaction & {
  book: Book;
};

export type TransactionWithUserAndBook = Transaction & {
  user: User;
  book: Book;
};

export type BookRequestWithBook = BookRequest & {
  book: Book;
};

export type BookRequestWithUserAndBook = BookRequest & {
  user: User;
  book: Book;
};