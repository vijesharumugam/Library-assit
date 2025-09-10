import { 
  User, 
  Book, 
  Transaction, 
  BookRequest,
  ExtensionRequest,
  Notification,
  PushSubscription,
  Role, 
  TransactionStatus,
  BookRequestStatus,
  ExtensionRequestStatus,
  InsertUser, 
  InsertBook, 
  InsertTransaction, 
  InsertBookRequest,
  InsertExtensionRequest,
  InsertNotification,
  InsertPushSubscription,
  UpdateProfile,
  TransactionWithBook, 
  TransactionWithUserAndBook,
  BookRequestWithBook,
  BookRequestWithUserAndBook,
  ExtensionRequestWithUser,
  ExtensionRequestWithUserAndTransaction
} from "@shared/schema";
import { prisma } from "./db";
import { convertPrismaUser, convertPrismaBook, convertPrismaTransaction, convertPrismaBookRequest, convertPrismaExtensionRequest } from "./types";
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
  updateProfile(userId: string, profile: UpdateProfile): Promise<User | null>;
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
  
  // Extension Request methods
  createExtensionRequest(request: InsertExtensionRequest): Promise<ExtensionRequest>;
  getExtensionRequestsByUser(userId: string): Promise<ExtensionRequestWithUserAndTransaction[]>;
  getAllExtensionRequests(): Promise<ExtensionRequestWithUserAndTransaction[]>;
  getPendingExtensionRequests(): Promise<ExtensionRequestWithUserAndTransaction[]>;
  approveExtensionRequest(requestId: string, processedBy: string, customDueDate: Date): Promise<ExtensionRequest | null>;
  rejectExtensionRequest(requestId: string, processedBy: string): Promise<ExtensionRequest | null>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | null>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  clearAllNotifications(userId: string): Promise<boolean>;
  
  // Push Subscription methods
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(id: string): Promise<boolean>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  
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
    const user = await prisma.user.findUnique({
      where: { id }
    });
    return user ? convertPrismaUser(user) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username }
    });
    return user ? convertPrismaUser(user) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    return user ? convertPrismaUser(user) : null;
  }

  async getUserByRegisterNumber(registerNumber: string): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: { studentId: registerNumber }
    });
    return user ? convertPrismaUser(user) : null;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await prisma.user.create({
      data: {
        ...insertUser,
        password: insertUser.password // Map password correctly
      }
    });
    return convertPrismaUser(user);
  }

  async updateUserRole(userId: string, role: Role): Promise<User | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role: role as any }
      });
      return convertPrismaUser(user);
    } catch (error) {
      return null;
    }
  }

  async updateProfile(userId: string, profile: UpdateProfile): Promise<User | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: profile
      });
      return convertPrismaUser(user);
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
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return users.map(convertPrismaUser);
  }

  async getStudents(): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      orderBy: { fullName: 'asc' }
    });
    return users.map(convertPrismaUser);
  }

  // Book methods
  async getBook(id: string): Promise<Book | null> {
    const book = await prisma.book.findUnique({
      where: { id }
    });
    return book ? convertPrismaBook(book) : null;
  }

  async getAllBooks(): Promise<Book[]> {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return books.map(convertPrismaBook);
  }

  async getAvailableBooks(): Promise<Book[]> {
    const books = await prisma.book.findMany({
      where: {
        availableCopies: { gt: 0 }
      },
      orderBy: { createdAt: 'desc' }
    });
    return books.map(convertPrismaBook);
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const book = await prisma.book.create({
      data: {
        ...insertBook,
        availableCopies: insertBook.totalCopies
      }
    });
    return convertPrismaBook(book);
  }

  async updateBook(id: string, bookData: Partial<InsertBook>): Promise<Book | null> {
    try {
      const book = await prisma.book.update({
        where: { id },
        data: bookData
      });
      return convertPrismaBook(book);
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

    // Create notification and send push notification for book borrowed
    const { PushNotificationService } = await import('./push-service');
    await PushNotificationService.sendNotificationToUser(transaction.userId, {
      title: "Book Borrowed Successfully",
      message: `You have successfully borrowed "${transaction.book.title}" by ${transaction.book.author}. Due date: ${new Date(transaction.dueDate).toLocaleDateString()}`,
      type: "BOOK_BORROWED" as any
    });

    return convertPrismaTransaction(transaction);
  }

  async getUserTransactions(userId: string): Promise<TransactionWithBook[]> {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { borrowedDate: 'desc' }
    });
    return transactions.map(t => ({
      ...convertPrismaTransaction(t),
      book: convertPrismaBook(t.book)
    }));
  }

  async getAllTransactions(): Promise<TransactionWithUserAndBook[]> {
    const transactions = await prisma.transaction.findMany({
      include: { 
        user: true, 
        book: true 
      },
      orderBy: { borrowedDate: 'desc' }
    });
    return transactions.map(t => ({
      ...convertPrismaTransaction(t),
      user: convertPrismaUser(t.user),
      book: convertPrismaBook(t.book)
    }));
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

      // Create notification and send push notification for book returned
      if (status === TransactionStatus.RETURNED) {
        const { PushNotificationService } = await import('./push-service');
        await PushNotificationService.sendNotificationToUser(transaction.userId, {
          title: "Book Returned Successfully",
          message: `You have successfully returned "${transaction.book.title}" by ${transaction.book.author}. Thank you for returning on time!`,
          type: "BOOK_RETURNED" as any
        });
      }

      return convertPrismaTransaction(transaction);
    } catch (error) {
      return null;
    }
  }

  async getActiveTransactions(): Promise<TransactionWithUserAndBook[]> {
    const transactions = await prisma.transaction.findMany({
      where: { 
        status: TransactionStatus.BORROWED 
      },
      include: { 
        user: true, 
        book: true 
      },
      orderBy: { borrowedDate: 'desc' }
    });
    return transactions.map(t => ({
      ...convertPrismaTransaction(t),
      user: convertPrismaUser(t.user),
      book: convertPrismaBook(t.book)
    }));
  }

  // Book Request methods
  async createBookRequest(insertRequest: InsertBookRequest): Promise<BookRequest> {
    const request = await prisma.bookRequest.create({
      data: insertRequest
    });
    return convertPrismaBookRequest(request);
  }

  async getBookRequestsByUser(userId: string): Promise<BookRequestWithBook[]> {
    const requests = await prisma.bookRequest.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { requestDate: 'desc' }
    });
    return requests.map(r => ({
      ...convertPrismaBookRequest(r),
      book: convertPrismaBook(r.book)
    }));
  }

  async getAllBookRequests(): Promise<BookRequestWithUserAndBook[]> {
    const requests = await prisma.bookRequest.findMany({
      include: { 
        user: true, 
        book: true 
      },
      orderBy: { requestDate: 'desc' }
    });
    return requests.map(r => ({
      ...convertPrismaBookRequest(r),
      user: convertPrismaUser(r.user),
      book: convertPrismaBook(r.book)
    }));
  }

  async getPendingBookRequests(): Promise<BookRequestWithUserAndBook[]> {
    const requests = await prisma.bookRequest.findMany({
      where: { 
        status: BookRequestStatus.PENDING 
      },
      include: { 
        user: true, 
        book: true 
      },
      orderBy: { requestDate: 'desc' }
    });
    return requests.map(r => ({
      ...convertPrismaBookRequest(r),
      user: convertPrismaUser(r.user),
      book: convertPrismaBook(r.book)
    }));
  }

  async updateBookRequestStatus(id: string, status: BookRequestStatus): Promise<BookRequest | null> {
    try {
      const request = await prisma.bookRequest.update({
        where: { id },
        data: { status }
      });
      return convertPrismaBookRequest(request);
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

  async approveBookRequest(requestId: string, librarianId: string, customDueDate?: Date): Promise<Transaction | null> {
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

      // Create transaction with custom due date or default 14 days
      const dueDate = customDueDate || (() => {
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 14);
        return defaultDue;
      })();

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

      return convertPrismaTransaction(transaction);
    } catch (error) {
      return null;
    }
  }

  // Extension Request methods
  async createExtensionRequest(insertExtensionRequest: InsertExtensionRequest): Promise<ExtensionRequest> {
    const extensionRequest = await (prisma as any).extensionRequest.create({
      data: insertExtensionRequest
    });
    return convertPrismaExtensionRequest(extensionRequest);
  }

  async getExtensionRequestsByUser(userId: string): Promise<ExtensionRequestWithUserAndTransaction[]> {
    const requests = await (prisma as any).extensionRequest.findMany({
      where: { userId },
      include: {
        user: true,
        transaction: {
          include: { book: true }
        }
      },
      orderBy: { requestDate: 'desc' }
    });
    
    return requests.map((request: any) => ({
      ...convertPrismaExtensionRequest(request),
      user: convertPrismaUser(request.user),
      transaction: {
        ...convertPrismaTransaction(request.transaction),
        book: convertPrismaBook(request.transaction.book)
      }
    })) as ExtensionRequestWithUserAndTransaction[];
  }

  async getAllExtensionRequests(): Promise<ExtensionRequestWithUserAndTransaction[]> {
    const requests = await (prisma as any).extensionRequest.findMany({
      include: {
        user: true,
        transaction: {
          include: { book: true }
        }
      },
      orderBy: { requestDate: 'desc' }
    });
    
    return requests.map((request: any) => ({
      ...convertPrismaExtensionRequest(request),
      user: convertPrismaUser(request.user),
      transaction: {
        ...convertPrismaTransaction(request.transaction),
        book: convertPrismaBook(request.transaction.book)
      }
    })) as ExtensionRequestWithUserAndTransaction[];
  }

  async getPendingExtensionRequests(): Promise<ExtensionRequestWithUserAndTransaction[]> {
    const requests = await (prisma as any).extensionRequest.findMany({
      where: { status: ExtensionRequestStatus.PENDING },
      include: {
        user: true,
        transaction: {
          include: { book: true }
        }
      },
      orderBy: { requestDate: 'desc' }
    });
    
    return requests.map((request: any) => ({
      ...convertPrismaExtensionRequest(request),
      user: convertPrismaUser(request.user),
      transaction: {
        ...convertPrismaTransaction(request.transaction),
        book: convertPrismaBook(request.transaction.book)
      }
    })) as ExtensionRequestWithUserAndTransaction[];
  }

  async approveExtensionRequest(requestId: string, processedBy: string, customDueDate: Date): Promise<ExtensionRequest | null> {
    try {
      const request = await (prisma as any).extensionRequest.findUnique({
        where: { id: requestId },
        include: { transaction: { include: { book: true } }, user: true }
      });

      if (!request || request.status !== ExtensionRequestStatus.PENDING) {
        return null;
      }

      // Update the transaction's due date with the custom date
      await prisma.transaction.update({
        where: { id: request.transactionId },
        data: { dueDate: customDueDate }
      });

      // Update extension request status
      const updatedRequest = await (prisma as any).extensionRequest.update({
        where: { id: requestId },
        data: {
          status: ExtensionRequestStatus.APPROVED,
          processedBy,
          processedDate: new Date()
        }
      });

      // Create notification and send push notification for approved extension
      const { PushNotificationService } = await import('./push-service');
      await PushNotificationService.sendNotificationToUser(request.userId, {
        title: "Extension Request Approved",
        message: `Your extension request for "${request.transaction.book.title}" has been approved. New due date: ${customDueDate.toLocaleDateString()}`,
        type: "EXTENSION_REQUEST_APPROVED" as any
      });

      return convertPrismaExtensionRequest(updatedRequest);
    } catch (error) {
      return null;
    }
  }

  async rejectExtensionRequest(requestId: string, processedBy: string): Promise<ExtensionRequest | null> {
    try {
      const request = await (prisma as any).extensionRequest.findUnique({
        where: { id: requestId },
        include: { transaction: { include: { book: true } }, user: true }
      });

      if (!request || request.status !== ExtensionRequestStatus.PENDING) {
        return null;
      }

      // Update extension request status
      const updatedRequest = await (prisma as any).extensionRequest.update({
        where: { id: requestId },
        data: {
          status: ExtensionRequestStatus.REJECTED,
          processedBy,
          processedDate: new Date()
        }
      });

      // Create notification and send push notification for rejected extension
      const { PushNotificationService } = await import('./push-service');
      await PushNotificationService.sendNotificationToUser(request.userId, {
        title: "Extension Request Rejected",
        message: `Your extension request for "${request.transaction.book.title}" has been rejected by the librarian.`,
        type: "EXTENSION_REQUEST_REJECTED" as any
      });

      return convertPrismaExtensionRequest(updatedRequest);
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

  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      await prisma.notification.deleteMany({
        where: { userId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Push Subscription methods
  async createPushSubscription(insertSubscription: InsertPushSubscription): Promise<PushSubscription> {
    return await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: insertSubscription.userId,
          endpoint: insertSubscription.endpoint
        }
      },
      update: {
        p256dh: insertSubscription.p256dh,
        auth: insertSubscription.auth
      },
      create: insertSubscription as any
    });
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await prisma.pushSubscription.findMany({
      where: { userId }
    });
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    try {
      await prisma.pushSubscription.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    const subscriptions = await prisma.pushSubscription.findMany({
      include: { user: true }
    });
    return subscriptions.map(sub => ({
      ...sub,
      user: sub.user ? convertPrismaUser(sub.user) : undefined
    })) as PushSubscription[];
  }
}

export const storage = new DatabaseStorage();