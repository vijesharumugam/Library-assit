import { z } from "zod";

// Manual type definitions to avoid importing Prisma client in frontend
export type User = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  studentId?: string | null;
  phone: string;
  password: string;
  role: Role;
  profilePicture?: string | null;
  createdAt: Date;
  transactions?: Transaction[];
  bookRequests?: BookRequest[];
  notifications?: Notification[];
};

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  category: string;
  description?: string | null;
  publisher?: string | null;
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
  transactions?: Transaction[];
  bookRequests?: BookRequest[];
};

export type Transaction = {
  id: string;
  userId: string;
  bookId: string;
  borrowedDate: Date;
  dueDate: Date;
  returnedDate?: Date | null;
  status: TransactionStatus;
  user?: User;
  book?: Book;
};

export type BookRequest = {
  id: string;
  userId: string;
  bookId: string;
  requestDate: Date;
  status: BookRequestStatus;
  requestedBy: string;
  notes?: string | null;
  user?: User;
  book?: Book;
};

export type ExtensionRequest = {
  id: string;
  transactionId: string;
  userId: string;
  requestDate: Date;
  currentDueDate: Date;
  requestedDueDate: Date;
  reason?: string | null;
  status: ExtensionRequestStatus;
  processedBy?: string | null;
  processedDate?: Date | null;
  user?: User;
  transaction?: Transaction;
};

// Define Notification types manually to avoid import issues
export type Notification = {
  id: string;
  userId: string;
  type: "BOOK_BORROWED" | "BOOK_RETURNED" | "BOOK_DUE_SOON" | "BOOK_OVERDUE" | "BOOK_REQUEST_REJECTED" | "EXTENSION_REQUEST_APPROVED" | "EXTENSION_REQUEST_REJECTED";
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
  BOOK_OVERDUE = "BOOK_OVERDUE",
  BOOK_REQUEST_REJECTED = "BOOK_REQUEST_REJECTED",
  EXTENSION_REQUEST_APPROVED = "EXTENSION_REQUEST_APPROVED",
  EXTENSION_REQUEST_REJECTED = "EXTENSION_REQUEST_REJECTED"
}

// Define enums manually to avoid Prisma imports
export enum Role {
  STUDENT = "STUDENT",
  LIBRARIAN = "LIBRARIAN", 
  ADMIN = "ADMIN"
}

export enum TransactionStatus {
  BORROWED = "BORROWED",
  RETURNED = "RETURNED",
  OVERDUE = "OVERDUE"
}

export enum BookRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED", 
  REJECTED = "REJECTED",
  FULFILLED = "FULFILLED"
}

export enum ExtensionRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

// Input validation schemas for creating new records
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required"),
  studentId: z.string().trim().optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(Role),
  profilePicture: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === Role.STUDENT && (!data.studentId || data.studentId.trim() === "")) {
    ctx.addIssue({ 
      code: z.ZodIssueCode.custom, 
      path: ["studentId"], 
      message: "Student ID is required for students" 
    });
  }
});

// Profile update schema (excludes password and role)
export const updateProfileSchema = z.object({
  username: z.string().min(1, "Username is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  fullName: z.string().min(1, "Full name is required").optional(),
  studentId: z.string().min(1, "Student ID is required").optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number").optional(),
  profilePicture: z.string().optional(),
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

export const insertExtensionRequestSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  userId: z.string().min(1, "User ID is required"),
  currentDueDate: z.date(),
  requestedDueDate: z.date(),
  reason: z.string().optional(),
  status: z.nativeEnum(ExtensionRequestStatus).optional(),
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Forgot password schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d{6}$/, "OTP must contain only numbers"),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// Inferred types for creating new records
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertBookRequest = z.infer<typeof insertBookRequestSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertExtensionRequest = z.infer<typeof insertExtensionRequestSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

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

export type ExtensionRequestWithUser = ExtensionRequest & {
  user: User;
};

export type ExtensionRequestWithUserAndTransaction = ExtensionRequest & {
  user: User;
  transaction: TransactionWithBook;
};

// Push subscription for Web Push API
export type PushSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
  user?: User;
};

export const insertPushSubscriptionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  endpoint: z.string().min(1, "Endpoint is required"),
  p256dh: z.string().min(1, "p256dh key is required"),
  auth: z.string().min(1, "Auth key is required"),
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// AI Content Summarization types
export type BookAIContent = {
  id: string;
  bookId: string;
  summary?: string | null;
  studyGuide?: string | null;
  quotes?: string[] | null;
  comprehensionQA?: { question: string; answer: string }[] | null;
  lastUpdated: Date;
  book?: Book;
};

export type AIAnalytics = {
  id: string;
  type: 'USAGE_PATTERN' | 'INVENTORY_INSIGHT' | 'USER_BEHAVIOR' | 'PERFORMANCE_METRIC';
  title: string;
  description: string;
  data: any; // JSON data for charts/analytics
  insights?: string | null; // AI-generated insights
  generatedAt: Date;
  validUntil?: Date | null;
};

export type AIPrediction = {
  id: string;
  type: 'OVERDUE_RISK' | 'POPULAR_BOOK_FORECAST' | 'OPTIMAL_DUE_DATE';
  targetId: string; // userId for overdue risk, bookId for popularity, transactionId for due date
  prediction: any; // JSON prediction data
  confidence: number; // 0-1 confidence score
  reasoning?: string | null; // AI reasoning
  createdAt: Date;
  validUntil?: Date | null;
};

// Zod schemas for AI features
export const insertBookAIContentSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  summary: z.string().optional(),
  studyGuide: z.string().optional(),
  quotes: z.array(z.string()).optional(),
  comprehensionQA: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).optional(),
});

export const insertAIAnalyticsSchema = z.object({
  type: z.enum(['USAGE_PATTERN', 'INVENTORY_INSIGHT', 'USER_BEHAVIOR', 'PERFORMANCE_METRIC']),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  data: z.any(), // JSON data
  insights: z.string().optional(),
  validUntil: z.date().optional(),
});

export const insertAIPredictionSchema = z.object({
  type: z.enum(['OVERDUE_RISK', 'POPULAR_BOOK_FORECAST', 'OPTIMAL_DUE_DATE']),
  targetId: z.string().min(1, "Target ID is required"),
  prediction: z.any(), // JSON prediction data
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  validUntil: z.date().optional(),
});

// Inferred types
export type InsertBookAIContent = z.infer<typeof insertBookAIContentSchema>;
export type InsertAIAnalytics = z.infer<typeof insertAIAnalyticsSchema>;
export type InsertAIPrediction = z.infer<typeof insertAIPredictionSchema>;

// User without sensitive fields for frontend
export type SafeUser = Omit<User, 'password'>;