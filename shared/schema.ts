import { z } from "zod";
import { User, Book, Transaction, Role, TransactionStatus } from "@prisma/client";

// Prisma-generated types
export type { User, Book, Transaction, Role, TransactionStatus };

// Prisma enums as runtime values
export { Role, TransactionStatus } from "@prisma/client";

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