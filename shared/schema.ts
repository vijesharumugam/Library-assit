import { z } from "zod";
import { User, Book, Transaction, BookRequest, Role, TransactionStatus, BookRequestStatus, Prisma } from "@prisma/client";

// Prisma-generated types
export type { User, Book, Transaction, BookRequest };

// Define Notification types manually to avoid import issues
export type Notification = {
  id: string;
  userId: string;
  type: "BOOK_BORROWED" | "BOOK_RETURNED" | "BOOK_DUE_SOON" | "BOOK_OVERDUE";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  user?: User;
};

export enum NotificationType {
  BOOK_BORROWED = "BOOK_BORROWED",
  BOOK_RETURNED = "BOOK_RETURNED", 
  BOOK_DUE_SOON = "BOOK_DUE_SOON",
  BOOK_OVERDUE = "BOOK_OVERDUE"
}

// Export enums both as types and runtime values  
export { Role, TransactionStatus, BookRequestStatus } from "@prisma/client";

// Input validation schemas for creating new records
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required"),
  studentId: z.string().min(1, "Student ID is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(Role).optional(),
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
  userId: z.string().min(1, "User ID is required"),
  bookId: z.string().min(1, "Book ID is required"),
  dueDate: z.date(),
  status: z.nativeEnum(TransactionStatus).optional(),
});

export const insertBookRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  bookId: z.string().min(1, "Book ID is required"),
  requestedBy: z.string().min(1, "Requested by field is required"),
  notes: z.string().optional(),
  status: z.nativeEnum(BookRequestStatus).optional(),
});

export const insertNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  isRead: z.boolean().optional(),
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Inferred types for creating new records
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertBookRequest = z.infer<typeof insertBookRequestSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Extended types for queries with relations (as returned by Prisma)
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

export type NotificationWithUser = Notification & {
  user: User;
};

// User without sensitive fields for frontend
export type SafeUser = Omit<User, 'password'>;