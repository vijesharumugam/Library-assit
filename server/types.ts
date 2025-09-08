// Server-side type conversions to handle Prisma/Schema enum differences
import type { User as PrismaUser, Book as PrismaBook, Transaction as PrismaTransaction, BookRequest as PrismaBookRequest } from "@prisma/client";
import type { User, Book, Transaction, BookRequest, ExtensionRequest } from "@shared/schema";

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