import { type User, type InsertUser, type Book, type InsertBook, type Transaction, type InsertTransaction } from "@shared/schema";
import { users, books, transactions } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(userId: string, role: "student" | "librarian" | "admin"): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Book methods
  getBook(id: string): Promise<Book | undefined>;
  getAllBooks(): Promise<Book[]>;
  getAvailableBooks(): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, book: Partial<InsertBook>): Promise<Book | undefined>;
  deleteBook(id: string): Promise<boolean>;
  updateBookAvailability(bookId: string, change: number): Promise<boolean>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<(Transaction & { book: Book })[]>;
  getAllTransactions(): Promise<(Transaction & { user: User; book: Book })[]>;
  updateTransactionStatus(id: string, status: "borrowed" | "returned" | "overdue", returnedDate?: Date): Promise<Transaction | undefined>;
  getActiveTransactions(): Promise<(Transaction & { user: User; book: Book })[]>;
  
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: "student" | "librarian" | "admin"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, userId));
    return result.rowCount > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Book methods
  async getBook(id: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book || undefined;
  }

  async getAllBooks(): Promise<Book[]> {
    return await db.select().from(books).orderBy(desc(books.createdAt));
  }

  async getAvailableBooks(): Promise<Book[]> {
    return await db.select().from(books).where(sql`${books.availableCopies} > 0`);
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const bookData = {
      ...insertBook,
      availableCopies: insertBook.totalCopies,
    };
    const [book] = await db
      .insert(books)
      .values(bookData)
      .returning();
    return book;
  }

  async updateBook(id: string, bookData: Partial<InsertBook>): Promise<Book | undefined> {
    const [book] = await db
      .update(books)
      .set(bookData)
      .where(eq(books.id, id))
      .returning();
    return book || undefined;
  }

  async deleteBook(id: string): Promise<boolean> {
    const result = await db.delete(books).where(eq(books.id, id));
    return result.rowCount > 0;
  }

  async updateBookAvailability(bookId: string, change: number): Promise<boolean> {
    const result = await db
      .update(books)
      .set({ availableCopies: sql`${books.availableCopies} + ${change}` })
      .where(eq(books.id, bookId));
    return result.rowCount > 0;
  }

  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getUserTransactions(userId: string): Promise<(Transaction & { book: Book })[]> {
    return await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        bookId: transactions.bookId,
        borrowedDate: transactions.borrowedDate,
        dueDate: transactions.dueDate,
        returnedDate: transactions.returnedDate,
        status: transactions.status,
        book: books,
      })
      .from(transactions)
      .innerJoin(books, eq(transactions.bookId, books.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.borrowedDate));
  }

  async getAllTransactions(): Promise<(Transaction & { user: User; book: Book })[]> {
    return await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        bookId: transactions.bookId,
        borrowedDate: transactions.borrowedDate,
        dueDate: transactions.dueDate,
        returnedDate: transactions.returnedDate,
        status: transactions.status,
        user: users,
        book: books,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .innerJoin(books, eq(transactions.bookId, books.id))
      .orderBy(desc(transactions.borrowedDate));
  }

  async updateTransactionStatus(id: string, status: "borrowed" | "returned" | "overdue", returnedDate?: Date): Promise<Transaction | undefined> {
    const updateData: any = { status };
    if (returnedDate) {
      updateData.returnedDate = returnedDate;
    }
    
    const [transaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async getActiveTransactions(): Promise<(Transaction & { user: User; book: Book })[]> {
    return await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        bookId: transactions.bookId,
        borrowedDate: transactions.borrowedDate,
        dueDate: transactions.dueDate,
        returnedDate: transactions.returnedDate,
        status: transactions.status,
        user: users,
        book: books,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .innerJoin(books, eq(transactions.bookId, books.id))
      .where(eq(transactions.status, "borrowed"))
      .orderBy(desc(transactions.borrowedDate));
  }
}

export const storage = new DatabaseStorage();
