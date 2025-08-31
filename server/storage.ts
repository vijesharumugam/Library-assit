import { 
  User, 
  Book, 
  Transaction, 
  Role, 
  TransactionStatus,
  InsertUser, 
  InsertBook, 
  InsertTransaction, 
  TransactionWithBook, 
  TransactionWithUserAndBook 
} from "@shared/schema";
import { prisma } from "./db";
import session from "express-session";
import MongoStore from "connect-mongo";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(userId: string, role: Role): Promise<User | null>;
  deleteUser(userId: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Book methods
  getBook(id: string): Promise<Book | null>;
  getAllBooks(): Promise<Book[]>;
  getAvailableBooks(): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, book: Partial<InsertBook>): Promise<Book | null>;
  deleteBook(id: string): Promise<boolean>;
  updateBookAvailability(bookId: string, change: number): Promise<boolean>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<TransactionWithBook[]>;
  getAllTransactions(): Promise<TransactionWithUserAndBook[]>;
  updateTransactionStatus(id: string, status: TransactionStatus, returnedDate?: Date): Promise<Transaction | null>;
  getActiveTransactions(): Promise<TransactionWithUserAndBook[]>;
  
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI!,
      touchAfter: 24 * 3600 // lazy session update
    });
  }

  // User methods
  async getUser(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { username }
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await prisma.user.create({
      data: insertUser
    });
  }

  async updateUserRole(userId: string, role: Role): Promise<User | null> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { role }
      });
    } catch (error) {
      return null;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id: userId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // Book methods
  async getBook(id: string): Promise<Book | null> {
    return await prisma.book.findUnique({
      where: { id }
    });
  }

  async getAllBooks(): Promise<Book[]> {
    return await prisma.book.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAvailableBooks(): Promise<Book[]> {
    return await prisma.book.findMany({
      where: {
        availableCopies: { gt: 0 }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    return await prisma.book.create({
      data: {
        ...insertBook,
        availableCopies: insertBook.totalCopies
      }
    });
  }

  async updateBook(id: string, bookData: Partial<InsertBook>): Promise<Book | null> {
    try {
      return await prisma.book.update({
        where: { id },
        data: bookData
      });
    } catch (error) {
      return null;
    }
  }

  async deleteBook(id: string): Promise<boolean> {
    try {
      await prisma.book.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateBookAvailability(bookId: string, change: number): Promise<boolean> {
    try {
      await prisma.book.update({
        where: { id: bookId },
        data: {
          availableCopies: {
            increment: change
          }
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    return await prisma.transaction.create({
      data: insertTransaction
    });
  }

  async getUserTransactions(userId: string): Promise<TransactionWithBook[]> {
    return await prisma.transaction.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { borrowedDate: 'desc' }
    });
  }

  async getAllTransactions(): Promise<TransactionWithUserAndBook[]> {
    return await prisma.transaction.findMany({
      include: { 
        user: true, 
        book: true 
      },
      orderBy: { borrowedDate: 'desc' }
    });
  }

  async updateTransactionStatus(id: string, status: TransactionStatus, returnedDate?: Date): Promise<Transaction | null> {
    try {
      const updateData: any = { status };
      if (returnedDate) {
        updateData.returnedDate = returnedDate;
      }
      
      return await prisma.transaction.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      return null;
    }
  }

  async getActiveTransactions(): Promise<TransactionWithUserAndBook[]> {
    return await prisma.transaction.findMany({
      where: { 
        status: TransactionStatus.BORROWED 
      },
      include: { 
        user: true, 
        book: true 
      },
      orderBy: { borrowedDate: 'desc' }
    });
  }
}

export const storage = new DatabaseStorage();