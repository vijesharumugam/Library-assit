import { 
  User, 
  Book, 
  Transaction, 
  BookRequest,
  Notification,
  Role, 
  TransactionStatus,
  BookRequestStatus,
  InsertUser, 
  InsertBook, 
  InsertTransaction, 
  InsertBookRequest,
  InsertNotification,
  TransactionWithBook, 
  TransactionWithUserAndBook,
  BookRequestWithBook,
  BookRequestWithUserAndBook
} from "@shared/schema";
import { prisma } from "./db";
import session from "express-session";
import MongoStore from "connect-mongo";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByRegisterNumber(registerNumber: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(userId: string, role: Role): Promise<User | null>;
  deleteUser(userId: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getStudents(): Promise<User[]>;
  
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
  
  // Book Request methods
  createBookRequest(request: InsertBookRequest): Promise<BookRequest>;
  getBookRequestsByUser(userId: string): Promise<BookRequestWithBook[]>;
  getAllBookRequests(): Promise<BookRequestWithUserAndBook[]>;
  getPendingBookRequests(): Promise<BookRequestWithUserAndBook[]>;
  updateBookRequestStatus(id: string, status: BookRequestStatus): Promise<BookRequest | null>;
  approveBookRequest(requestId: string, librarianId: string): Promise<Transaction | null>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | null>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

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

  async getUserByRegisterNumber(registerNumber: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { studentId: registerNumber }
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await prisma.user.create({
      data: {
        ...insertUser,
        password: insertUser.password // Map password correctly
      }
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

  async getStudents(): Promise<User[]> {
    return await prisma.user.findMany({
      where: { role: Role.STUDENT },
      orderBy: { fullName: 'asc' }
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
    const transaction = await prisma.transaction.create({
      data: insertTransaction,
      include: { book: true, user: true }
    });

    // Create notification for book borrowed
    await this.createNotification({
      userId: transaction.userId,
      type: "BOOK_BORROWED" as any,
      title: "Book Borrowed Successfully",
      message: `You have successfully borrowed "${transaction.book.title}" by ${transaction.book.author}. Due date: ${new Date(transaction.dueDate).toLocaleDateString()}`
    });

    return transaction;
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
      
      const transaction = await prisma.transaction.update({
        where: { id },
        data: updateData,
        include: { book: true, user: true }
      });

      // Create notification for book returned
      if (status === TransactionStatus.RETURNED) {
        await this.createNotification({
          userId: transaction.userId,
          type: "BOOK_RETURNED" as any,
          title: "Book Returned Successfully",
          message: `You have successfully returned "${transaction.book.title}" by ${transaction.book.author}. Thank you for returning on time!`
        });
      }

      return transaction;
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

  // Book Request methods
  async createBookRequest(insertRequest: InsertBookRequest): Promise<BookRequest> {
    return await prisma.bookRequest.create({
      data: insertRequest
    });
  }

  async getBookRequestsByUser(userId: string): Promise<BookRequestWithBook[]> {
    return await prisma.bookRequest.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { requestDate: 'desc' }
    });
  }

  async getAllBookRequests(): Promise<BookRequestWithUserAndBook[]> {
    return await prisma.bookRequest.findMany({
      include: { 
        user: true, 
        book: true 
      },
      orderBy: { requestDate: 'desc' }
    });
  }

  async getPendingBookRequests(): Promise<BookRequestWithUserAndBook[]> {
    return await prisma.bookRequest.findMany({
      where: { 
        status: BookRequestStatus.PENDING 
      },
      include: { 
        user: true, 
        book: true 
      },
      orderBy: { requestDate: 'desc' }
    });
  }

  async updateBookRequestStatus(id: string, status: BookRequestStatus): Promise<BookRequest | null> {
    try {
      return await prisma.bookRequest.update({
        where: { id },
        data: { status }
      });
    } catch (error) {
      return null;
    }
  }

  async rejectBookRequest(requestId: string): Promise<BookRequest | null> {
    try {
      const request = await prisma.bookRequest.findUnique({
        where: { id: requestId },
        include: { book: true, user: true }
      });

      if (!request) {
        return null;
      }

      // Update request status to rejected
      const rejectedRequest = await this.updateBookRequestStatus(requestId, BookRequestStatus.REJECTED);

      // Create notification for rejected request
      await this.createNotification({
        userId: request.userId,
        type: "BOOK_OVERDUE" as any,
        title: "Book Request Rejected",
        message: `Your request for "${request.book.title}" by ${request.book.author} has been rejected by the librarian.`
      });

      return rejectedRequest;
    } catch (error) {
      return null;
    }
  }

  async approveBookRequest(requestId: string, librarianId: string): Promise<Transaction | null> {
    try {
      const request = await prisma.bookRequest.findUnique({
        where: { id: requestId },
        include: { book: true, user: true }
      });

      if (!request || request.status !== BookRequestStatus.PENDING) {
        return null;
      }

      // Check if book is available
      if (request.book.availableCopies <= 0) {
        return null;
      }

      // Create transaction
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 14 days from now

      const transaction = await prisma.transaction.create({
        data: {
          userId: request.userId,
          bookId: request.bookId,
          dueDate,
          status: TransactionStatus.BORROWED
        }
      });

      // Update book availability
      await this.updateBookAvailability(request.bookId, -1);

      // Update request status
      await this.updateBookRequestStatus(requestId, BookRequestStatus.FULFILLED);

      // Create notification for book borrowed via request approval
      await this.createNotification({
        userId: transaction.userId,
        type: "BOOK_BORROWED" as any,
        title: "Book Request Approved",
        message: `Your request for "${request.book.title}" by ${request.book.author} has been approved. Due date: ${dueDate.toLocaleDateString()}`
      });

      return transaction;
    } catch (error) {
      return null;
    }
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    return await prisma.notification.create({
      data: insertNotification as any
    });
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markNotificationAsRead(id: string): Promise<Notification | null> {
    try {
      return await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
    } catch (error) {
      return null;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const storage = new DatabaseStorage();