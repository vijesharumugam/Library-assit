// Server-side type conversions to handle Prisma/Schema enum differences
import type { User as PrismaUser, Book as PrismaBook, Transaction as PrismaTransaction, BookRequest as PrismaBookRequest, BookAIContent as PrismaBookAIContent, AIAnalytics as PrismaAIAnalytics, AIPrediction as PrismaAIPrediction } from "@prisma/client";
import type { User, Book, Transaction, BookRequest, ExtensionRequest, BookAIContent, AIAnalytics, AIPrediction } from "@shared/schema";

// Convert Prisma types to shared schema types
export function convertPrismaUser(user: PrismaUser): User {
  return {
    ...user,
    role: user.role as any, // Type assertion to handle enum difference
  };
}

export function convertPrismaBook(book: PrismaBook): Book {
  return book as any;
}

export function convertPrismaTransaction(transaction: PrismaTransaction): Transaction {
  return {
    ...transaction,
    status: transaction.status as any,
  };
}

export function convertPrismaBookRequest(bookRequest: PrismaBookRequest): BookRequest {
  return {
    ...bookRequest,
    status: bookRequest.status as any,
  };
}

export function convertPrismaExtensionRequest(extensionRequest: any): ExtensionRequest {
  return {
    ...extensionRequest,
    status: extensionRequest.status as any,
  };
}

export function convertPrismaBookAIContent(content: PrismaBookAIContent): BookAIContent {
  return {
    ...content,
    quotes: content.quotes as string[] | null,
    comprehensionQA: content.comprehensionQA as { question: string; answer: string }[] | null,
  };
}

export function convertPrismaAIAnalytics(analytics: PrismaAIAnalytics): AIAnalytics {
  return {
    ...analytics,
    type: analytics.type as any,
    data: analytics.data as any,
  };
}

export function convertPrismaAIPrediction(prediction: PrismaAIPrediction): AIPrediction {
  return {
    ...prediction,
    type: prediction.type as any,
    prediction: prediction.prediction as any,
  };
}