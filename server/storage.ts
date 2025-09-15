import { 
  User, 
  Book, 
  Transaction, 
  BookRequest,
  ExtensionRequest,
  Notification,
  PushSubscription,
  BookAIContent,
  AIAnalytics,
  AIPrediction,
  ChatSession,
  ChatMessage,
  Role, 
  TransactionStatus,
  BookRequestStatus,
  ExtensionRequestStatus,
  NotificationType,
  InsertUser, 
  InsertBook, 
  InsertTransaction, 
  InsertBookRequest,
  InsertExtensionRequest,
  InsertNotification,
  InsertPushSubscription,
  InsertBookAIContent,
  InsertAIAnalytics,
  InsertAIPrediction,
  InsertChatSession,
  UpdateProfile,
  TransactionWithBook, 
  TransactionWithUserAndBook,
  BookRequestWithBook,
  BookRequestWithUserAndBook,
  ExtensionRequestWithUser,
  ExtensionRequestWithUserAndTransaction
} from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import MongoStore from "connect-mongo";
import { nanoid } from "nanoid";
import { prisma } from "./db";
import { convertPrismaUser, convertPrismaBook, convertPrismaTransaction, convertPrismaBookRequest, convertPrismaExtensionRequest, convertPrismaBookAIContent, convertPrismaAIAnalytics, convertPrismaAIPrediction } from "./types";

const MemoryStoreSession = MemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByRegisterNumber(registerNumber: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(userId: string, role: Role): Promise<User | null>;
  updateProfile(userId: string, profile: UpdateProfile): Promise<User | null>;
  updatePassword(userId: string, password: string): Promise<User | null>;
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
  rejectBookRequest(requestId: string): Promise<BookRequest | null>;
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

  // AI Content methods
  getBookAIContent(bookId: string): Promise<BookAIContent | null>;
  createBookAIContent(content: InsertBookAIContent): Promise<BookAIContent>;
  updateBookAIContent(bookId: string, content: Partial<InsertBookAIContent>): Promise<BookAIContent | null>;
  getAllBookAIContent(): Promise<BookAIContent[]>;

  // AI Analytics methods
  createAIAnalytics(analytics: InsertAIAnalytics): Promise<AIAnalytics>;
  getAIAnalyticsByType(type: string): Promise<AIAnalytics[]>;
  getAllAIAnalytics(): Promise<AIAnalytics[]>;
  deleteOldAIAnalytics(cutoffDate: Date): Promise<number>;

  // AI Prediction methods
  createAIPrediction(prediction: InsertAIPrediction): Promise<AIPrediction>;
  getAIPredictionsByType(type: string): Promise<AIPrediction[]>;
  getAIPredictionsByTarget(targetId: string): Promise<AIPrediction[]>;
  getAllAIPredictions(): Promise<AIPrediction[]>;
  deleteOldAIPredictions(cutoffDate: Date): Promise<number>;

  // Chat Session methods
  getChatSession(userId: string): Promise<ChatSession | null>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(userId: string, messages: ChatMessage[]): Promise<ChatSession | null>;
  clearChatSession(userId: string): Promise<boolean>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private books = new Map<string, Book>();
  private transactions = new Map<string, Transaction>();
  private bookRequests = new Map<string, BookRequest>();
  private extensionRequests = new Map<string, ExtensionRequest>();
  private notifications = new Map<string, Notification>();
  private pushSubscriptions = new Map<string, PushSubscription>();
  private bookAIContent = new Map<string, BookAIContent>();
  private aiAnalytics = new Map<string, AIAnalytics>();
  private aiPredictions = new Map<string, AIPrediction>();
  private chatSessions = new Map<string, ChatSession>();

  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const users = Array.from(this.users.values());
    return users.find(user => user.username === username) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = Array.from(this.users.values());
    return users.find(user => user.email === email) || null;
  }

  async getUserByRegisterNumber(registerNumber: string): Promise<User | null> {
    const users = Array.from(this.users.values());
    return users.find(user => user.studentId === registerNumber) || null;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: nanoid(),
      ...insertUser,
      role: insertUser.role || Role.STUDENT,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserRole(userId: string, role: Role): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    
    const updatedUser = { ...user, role };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateProfile(userId: string, profile: UpdateProfile): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    
    const updatedUser = { ...user, ...profile };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updatePassword(userId: string, password: string): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    
    const updatedUser = { ...user, password };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.users.delete(userId);
  }

  async getAllUsers(): Promise<User[]> {
    const users = Array.from(this.users.values());
    return users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getStudents(): Promise<User[]> {
    const users = Array.from(this.users.values());
    return users
      .filter(user => user.role === Role.STUDENT)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // Book methods
  async getBook(id: string): Promise<Book | null> {
    return this.books.get(id) || null;
  }

  async getAllBooks(): Promise<Book[]> {
    const books = Array.from(this.books.values());
    return books.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAvailableBooks(): Promise<Book[]> {
    const books = Array.from(this.books.values());
    return books
      .filter(book => book.availableCopies > 0)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const book: Book = {
      id: nanoid(),
      ...insertBook,
      availableCopies: insertBook.totalCopies,
      createdAt: new Date()
    };
    this.books.set(book.id, book);
    return book;
  }

  async updateBook(id: string, bookData: Partial<InsertBook>): Promise<Book | null> {
    const book = this.books.get(id);
    if (!book) return null;
    
    const updatedBook = { ...book, ...bookData };
    this.books.set(id, updatedBook);
    return updatedBook;
  }

  async deleteBook(id: string): Promise<boolean> {
    return this.books.delete(id);
  }

  async updateBookAvailability(bookId: string, change: number): Promise<boolean> {
    const book = this.books.get(bookId);
    if (!book) return false;
    
    const updatedBook = { ...book, availableCopies: book.availableCopies + change };
    this.books.set(bookId, updatedBook);
    return true;
  }

  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      id: nanoid(),
      ...insertTransaction,
      borrowedDate: new Date(),
      status: insertTransaction.status || TransactionStatus.BORROWED
    };
    this.transactions.set(transaction.id, transaction);

    // Send notification for book borrowed
    const book = await this.getBook(transaction.bookId);
    if (book) {
      await this.createNotification({
        userId: transaction.userId,
        type: NotificationType.BOOK_BORROWED,
        title: "Book Borrowed Successfully",
        message: `You have successfully borrowed "${book.title}" by ${book.author}. Due date: ${new Date(transaction.dueDate).toLocaleDateString()}`
      });
    }

    return transaction;
  }

  async getUserTransactions(userId: string): Promise<TransactionWithBook[]> {
    const transactions = Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => b.borrowedDate.getTime() - a.borrowedDate.getTime());

    const result: TransactionWithBook[] = [];
    for (const transaction of transactions) {
      const book = await this.getBook(transaction.bookId);
      if (book) {
        result.push({ ...transaction, book });
      }
    }
    return result;
  }

  async getAllTransactions(): Promise<TransactionWithUserAndBook[]> {
    const transactions = Array.from(this.transactions.values())
      .sort((a, b) => b.borrowedDate.getTime() - a.borrowedDate.getTime());

    const result: TransactionWithUserAndBook[] = [];
    for (const transaction of transactions) {
      const user = await this.getUser(transaction.userId);
      const book = await this.getBook(transaction.bookId);
      if (user && book) {
        result.push({ ...transaction, user, book });
      }
    }
    return result;
  }

  async updateTransactionStatus(id: string, status: TransactionStatus, returnedDate?: Date): Promise<Transaction | null> {
    const transaction = this.transactions.get(id);
    if (!transaction) return null;
    
    const updatedTransaction = { 
      ...transaction, 
      status,
      ...(returnedDate && { returnedDate })
    };
    this.transactions.set(id, updatedTransaction);

    // Send notification for book returned
    if (status === TransactionStatus.RETURNED) {
      const book = await this.getBook(transaction.bookId);
      if (book) {
        await this.createNotification({
          userId: transaction.userId,
          type: NotificationType.BOOK_RETURNED,
          title: "Book Returned Successfully",
          message: `You have successfully returned "${book.title}" by ${book.author}. Thank you for returning on time!`
        });
      }
    }

    return updatedTransaction;
  }

  async getActiveTransactions(): Promise<TransactionWithUserAndBook[]> {
    const transactions = Array.from(this.transactions.values())
      .filter(transaction => transaction.status === TransactionStatus.BORROWED)
      .sort((a, b) => b.borrowedDate.getTime() - a.borrowedDate.getTime());

    const result: TransactionWithUserAndBook[] = [];
    for (const transaction of transactions) {
      const user = await this.getUser(transaction.userId);
      const book = await this.getBook(transaction.bookId);
      if (user && book) {
        result.push({ ...transaction, user, book });
      }
    }
    return result;
  }

  // Book Request methods
  async createBookRequest(insertRequest: InsertBookRequest): Promise<BookRequest> {
    const request: BookRequest = {
      id: nanoid(),
      ...insertRequest,
      requestDate: new Date(),
      status: insertRequest.status || BookRequestStatus.PENDING
    };
    this.bookRequests.set(request.id, request);
    return request;
  }

  async getBookRequestsByUser(userId: string): Promise<BookRequestWithBook[]> {
    const requests = Array.from(this.bookRequests.values())
      .filter(request => request.userId === userId)
      .sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());

    const result: BookRequestWithBook[] = [];
    for (const request of requests) {
      const book = await this.getBook(request.bookId);
      if (book) {
        result.push({ ...request, book });
      }
    }
    return result;
  }

  async getAllBookRequests(): Promise<BookRequestWithUserAndBook[]> {
    const requests = Array.from(this.bookRequests.values())
      .sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());

    const result: BookRequestWithUserAndBook[] = [];
    for (const request of requests) {
      const user = await this.getUser(request.userId);
      const book = await this.getBook(request.bookId);
      if (user && book) {
        result.push({ ...request, user, book });
      }
    }
    return result;
  }

  async getPendingBookRequests(): Promise<BookRequestWithUserAndBook[]> {
    const requests = Array.from(this.bookRequests.values())
      .filter(request => request.status === BookRequestStatus.PENDING)
      .sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());

    const result: BookRequestWithUserAndBook[] = [];
    for (const request of requests) {
      const user = await this.getUser(request.userId);
      const book = await this.getBook(request.bookId);
      if (user && book) {
        result.push({ ...request, user, book });
      }
    }
    return result;
  }

  async updateBookRequestStatus(id: string, status: BookRequestStatus): Promise<BookRequest | null> {
    const request = this.bookRequests.get(id);
    if (!request) return null;
    
    const updatedRequest = { ...request, status };
    this.bookRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async rejectBookRequest(requestId: string): Promise<BookRequest | null> {
    const request = this.bookRequests.get(requestId);
    if (!request || request.status !== BookRequestStatus.PENDING) return null;

    const book = await this.getBook(request.bookId);
    if (!book) return null;

    // Update request status to rejected
    const rejectedRequest = await this.updateBookRequestStatus(requestId, BookRequestStatus.REJECTED);

    // Create notification for rejected request
    await this.createNotification({
      userId: request.userId,
      type: "BOOK_REQUEST_REJECTED" as any,
      title: "Book Request Rejected", 
      message: `Your request for "${book.title}" by ${book.author} has been rejected by the librarian.`
    });

    return rejectedRequest;
  }

  async approveBookRequest(requestId: string, librarianId: string, customDueDate?: Date): Promise<Transaction | null> {
    const request = this.bookRequests.get(requestId);
    if (!request || request.status !== BookRequestStatus.PENDING) return null;

    const book = await this.getBook(request.bookId);
    if (!book || book.availableCopies <= 0) return null;

    // Create transaction
    const dueDate = customDueDate || (() => {
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 14);
      return defaultDue;
    })();

    const transaction = await this.createTransaction({
      userId: request.userId,
      bookId: request.bookId,
      dueDate,
      status: TransactionStatus.BORROWED
    });

    // Update book availability
    await this.updateBookAvailability(request.bookId, -1);

    // Update request status
    await this.updateBookRequestStatus(requestId, BookRequestStatus.FULFILLED);

    // Create notification
    await this.createNotification({
      userId: transaction.userId,
      type: NotificationType.BOOK_BORROWED,
      title: "Book Request Approved",
      message: `Your request for "${book.title}" by ${book.author} has been approved. Due date: ${dueDate.toLocaleDateString()}`
    });

    return transaction;
  }

  // Extension Request methods
  async createExtensionRequest(insertExtensionRequest: InsertExtensionRequest): Promise<ExtensionRequest> {
    const extensionRequest: ExtensionRequest = {
      id: nanoid(),
      ...insertExtensionRequest,
      requestDate: new Date(),
      status: insertExtensionRequest.status || ExtensionRequestStatus.PENDING
    };
    this.extensionRequests.set(extensionRequest.id, extensionRequest);
    return extensionRequest;
  }

  async getExtensionRequestsByUser(userId: string): Promise<ExtensionRequestWithUserAndTransaction[]> {
    const requests = Array.from(this.extensionRequests.values())
      .filter(request => request.userId === userId)
      .sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());

    const result: ExtensionRequestWithUserAndTransaction[] = [];
    for (const request of requests) {
      const user = await this.getUser(request.userId);
      const transaction = this.transactions.get(request.transactionId);
      if (user && transaction) {
        const book = await this.getBook(transaction.bookId);
        if (book) {
          result.push({ 
            ...request, 
            user, 
            transaction: { ...transaction, book } 
          });
        }
      }
    }
    return result;
  }

  async getAllExtensionRequests(): Promise<ExtensionRequestWithUserAndTransaction[]> {
    const requests = Array.from(this.extensionRequests.values())
      .sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());

    const result: ExtensionRequestWithUserAndTransaction[] = [];
    for (const request of requests) {
      const user = await this.getUser(request.userId);
      const transaction = this.transactions.get(request.transactionId);
      if (user && transaction) {
        const book = await this.getBook(transaction.bookId);
        if (book) {
          result.push({ 
            ...request, 
            user, 
            transaction: { ...transaction, book } 
          });
        }
      }
    }
    return result;
  }

  async getPendingExtensionRequests(): Promise<ExtensionRequestWithUserAndTransaction[]> {
    const requests = Array.from(this.extensionRequests.values())
      .filter(request => request.status === ExtensionRequestStatus.PENDING)
      .sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());

    const result: ExtensionRequestWithUserAndTransaction[] = [];
    for (const request of requests) {
      const user = await this.getUser(request.userId);
      const transaction = this.transactions.get(request.transactionId);
      if (user && transaction) {
        const book = await this.getBook(transaction.bookId);
        if (book) {
          result.push({ 
            ...request, 
            user, 
            transaction: { ...transaction, book } 
          });
        }
      }
    }
    return result;
  }

  async approveExtensionRequest(requestId: string, processedBy: string, customDueDate: Date): Promise<ExtensionRequest | null> {
    const request = this.extensionRequests.get(requestId);
    if (!request || request.status !== ExtensionRequestStatus.PENDING) return null;

    const transaction = this.transactions.get(request.transactionId);
    if (!transaction) return null;

    // Update transaction due date
    const updatedTransaction = { ...transaction, dueDate: customDueDate };
    this.transactions.set(request.transactionId, updatedTransaction);

    // Update extension request
    const updatedRequest = {
      ...request,
      status: ExtensionRequestStatus.APPROVED,
      processedBy,
      processedDate: new Date()
    };
    this.extensionRequests.set(requestId, updatedRequest);

    // Create notification
    const book = await this.getBook(transaction.bookId);
    if (book) {
      await this.createNotification({
        userId: request.userId,
        type: NotificationType.EXTENSION_REQUEST_APPROVED,
        title: "Extension Request Approved",
        message: `Your extension request for "${book.title}" has been approved. New due date: ${customDueDate.toLocaleDateString()}`
      });
    }

    return updatedRequest;
  }

  async rejectExtensionRequest(requestId: string, processedBy: string): Promise<ExtensionRequest | null> {
    const request = this.extensionRequests.get(requestId);
    if (!request || request.status !== ExtensionRequestStatus.PENDING) return null;

    const updatedRequest = {
      ...request,
      status: ExtensionRequestStatus.REJECTED,
      processedBy,
      processedDate: new Date()
    };
    this.extensionRequests.set(requestId, updatedRequest);

    // Create notification
    const transaction = this.transactions.get(request.transactionId);
    if (transaction) {
      const book = await this.getBook(transaction.bookId);
      if (book) {
        await this.createNotification({
          userId: request.userId,
          type: NotificationType.EXTENSION_REQUEST_REJECTED,
          title: "Extension Request Rejected",
          message: `Your extension request for "${book.title}" has been rejected by the librarian.`
        });
      }
    }

    return updatedRequest;
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      id: nanoid(),
      ...insertNotification,
      isRead: false,
      createdAt: new Date()
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return notifications;
  }

  async markNotificationAsRead(id: string): Promise<Notification | null> {
    const notification = this.notifications.get(id);
    if (!notification) return null;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const notifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead);
    
    for (const notification of notifications) {
      const updatedNotification = { ...notification, isRead: true };
      this.notifications.set(notification.id, updatedNotification);
    }
    return true;
  }

  async clearAllNotifications(userId: string): Promise<boolean> {
    const notifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId);
    
    for (const notification of notifications) {
      this.notifications.delete(notification.id);
    }
    return true;
  }

  // Push Subscription methods
  async createPushSubscription(insertSubscription: InsertPushSubscription): Promise<PushSubscription> {
    const subscription: PushSubscription = {
      id: nanoid(),
      ...insertSubscription,
      createdAt: new Date()
    };
    this.pushSubscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const subscriptions = Array.from(this.pushSubscriptions.values())
      .filter(subscription => subscription.userId === userId);
    return subscriptions;
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    return this.pushSubscriptions.delete(id);
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values());
  }

  // AI Content methods
  async getBookAIContent(bookId: string): Promise<BookAIContent | null> {
    return Array.from(this.bookAIContent.values()).find(content => content.bookId === bookId) || null;
  }

  async createBookAIContent(content: InsertBookAIContent): Promise<BookAIContent> {
    const aiContent: BookAIContent = {
      id: nanoid(),
      ...content,
      lastUpdated: new Date(),
    };
    this.bookAIContent.set(aiContent.id, aiContent);
    return aiContent;
  }

  async updateBookAIContent(bookId: string, content: Partial<InsertBookAIContent>): Promise<BookAIContent | null> {
    const existingContent = Array.from(this.bookAIContent.values()).find(c => c.bookId === bookId);
    if (!existingContent) return null;
    
    const updatedContent = { 
      ...existingContent, 
      ...content, 
      lastUpdated: new Date() 
    };
    this.bookAIContent.set(existingContent.id, updatedContent);
    return updatedContent;
  }

  async getAllBookAIContent(): Promise<BookAIContent[]> {
    return Array.from(this.bookAIContent.values());
  }

  // AI Analytics methods
  async createAIAnalytics(analytics: InsertAIAnalytics): Promise<AIAnalytics> {
    const aiAnalytics: AIAnalytics = {
      id: nanoid(),
      type: analytics.type,
      title: analytics.title,
      description: analytics.description,
      data: analytics.data || {},
      insights: analytics.insights,
      validUntil: analytics.validUntil,
      generatedAt: new Date(),
    };
    this.aiAnalytics.set(aiAnalytics.id, aiAnalytics);
    return aiAnalytics;
  }

  async getAIAnalyticsByType(type: string): Promise<AIAnalytics[]> {
    return Array.from(this.aiAnalytics.values()).filter(analytics => analytics.type === type);
  }

  async getAllAIAnalytics(): Promise<AIAnalytics[]> {
    return Array.from(this.aiAnalytics.values());
  }

  async deleteOldAIAnalytics(cutoffDate: Date): Promise<number> {
    const analytics = Array.from(this.aiAnalytics.values());
    let deletedCount = 0;
    
    analytics.forEach(item => {
      if (item.generatedAt < cutoffDate) {
        this.aiAnalytics.delete(item.id);
        deletedCount++;
      }
    });
    
    return deletedCount;
  }

  // AI Prediction methods
  async createAIPrediction(prediction: InsertAIPrediction): Promise<AIPrediction> {
    const aiPrediction: AIPrediction = {
      id: nanoid(),
      type: prediction.type,
      targetId: prediction.targetId,
      prediction: prediction.prediction || {},
      confidence: prediction.confidence,
      reasoning: prediction.reasoning,
      validUntil: prediction.validUntil,
      createdAt: new Date(),
    };
    this.aiPredictions.set(aiPrediction.id, aiPrediction);
    return aiPrediction;
  }

  async getAIPredictionsByType(type: string): Promise<AIPrediction[]> {
    return Array.from(this.aiPredictions.values()).filter(prediction => prediction.type === type);
  }

  async getAIPredictionsByTarget(targetId: string): Promise<AIPrediction[]> {
    return Array.from(this.aiPredictions.values()).filter(prediction => prediction.targetId === targetId);
  }

  async getAllAIPredictions(): Promise<AIPrediction[]> {
    return Array.from(this.aiPredictions.values());
  }

  async deleteOldAIPredictions(cutoffDate: Date): Promise<number> {
    const predictions = Array.from(this.aiPredictions.values());
    let deletedCount = 0;
    
    predictions.forEach(item => {
      if (item.createdAt < cutoffDate) {
        this.aiPredictions.delete(item.id);
        deletedCount++;
      }
    });
    
    return deletedCount;
  }

  // Chat Session methods
  async getChatSession(userId: string): Promise<ChatSession | null> {
    return Array.from(this.chatSessions.values()).find(session => session.userId === userId) || null;
  }

  async createChatSession(sessionData: InsertChatSession): Promise<ChatSession> {
    const session: ChatSession = {
      id: nanoid(),
      ...sessionData,
      lastActivity: new Date(),
      createdAt: new Date(),
    };
    this.chatSessions.set(session.id, session);
    return session;
  }

  async updateChatSession(userId: string, messages: ChatMessage[]): Promise<ChatSession | null> {
    const existingSession = await this.getChatSession(userId);
    if (!existingSession) {
      // Create new session if it doesn't exist
      return await this.createChatSession({ userId, messages });
    }
    
    const updatedSession = { 
      ...existingSession, 
      messages, 
      lastActivity: new Date() 
    };
    this.chatSessions.set(existingSession.id, updatedSession);
    return updatedSession;
  }

  async clearChatSession(userId: string): Promise<boolean> {
    const session = await this.getChatSession(userId);
    if (session) {
      this.chatSessions.delete(session.id);
      return true;
    }
    return false;
  }
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
    if (!prisma) return null;
    const user = await prisma.user.findUnique({
      where: { id }
    });
    return user ? convertPrismaUser(user) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (!prisma) return null;
    const user = await prisma.user.findUnique({
      where: { username }
    });
    return user ? convertPrismaUser(user) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!prisma) return null;
    const user = await prisma.user.findUnique({
      where: { email }
    });
    return user ? convertPrismaUser(user) : null;
  }

  async getUserByRegisterNumber(registerNumber: string): Promise<User | null> {
    if (!prisma) return null;
    const user = await prisma.user.findFirst({
      where: { studentId: registerNumber }
    });
    return user ? convertPrismaUser(user) : null;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!prisma) throw new Error("Database not available");
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
      if (!prisma) return null;
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
      if (!prisma) return null;
      const user = await prisma.user.update({
        where: { id: userId },
        data: profile
      });
      return convertPrismaUser(user);
    } catch (error) {
      return null;
    }
  }

  async updatePassword(userId: string, password: string): Promise<User | null> {
    try {
      if (!prisma) return null;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { password }
      });
      return convertPrismaUser(user);
    } catch (error) {
      return null;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      if (!prisma) return false;
      await prisma.user.delete({
        where: { id: userId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!prisma) return [];
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return users.map(convertPrismaUser);
  }

  async getStudents(): Promise<User[]> {
    if (!prisma) return [];
    const users = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      orderBy: { fullName: 'asc' }
    });
    return users.map(convertPrismaUser);
  }

  // Book methods
  async getBook(id: string): Promise<Book | null> {
    if (!prisma) return null;
    const book = await prisma.book.findUnique({
      where: { id }
    });
    return book ? convertPrismaBook(book) : null;
  }

  async getAllBooks(): Promise<Book[]> {
    if (!prisma) return [];
    const books = await prisma.book.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return books.map(convertPrismaBook);
  }

  async getAvailableBooks(): Promise<Book[]> {
    if (!prisma) return [];
    const books = await prisma.book.findMany({
      where: {
        availableCopies: { gt: 0 }
      },
      orderBy: { createdAt: 'desc' }
    });
    return books.map(convertPrismaBook);
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    if (!prisma) throw new Error("Database not available");
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
      if (!prisma) return null;
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
      if (!prisma) return false;
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
      if (!prisma) return false;
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
    if (!prisma) throw new Error("Database not available");
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
    if (!prisma) return [];
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
    if (!prisma) return [];
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

  // AI Content methods - MongoDB implementation
  async getBookAIContent(bookId: string): Promise<BookAIContent | null> {
    if (!prisma) return null;
    const content = await prisma.bookAIContent.findUnique({
      where: { bookId }
    });
    return content ? convertPrismaBookAIContent(content) : null;
  }

  async createBookAIContent(content: InsertBookAIContent): Promise<BookAIContent> {
    if (!prisma) throw new Error("Database not available");
    const created = await prisma.bookAIContent.create({
      data: content as any
    });
    return convertPrismaBookAIContent(created);
  }

  async updateBookAIContent(bookId: string, content: Partial<InsertBookAIContent>): Promise<BookAIContent | null> {
    try {
      if (!prisma) return null;
      const updated = await prisma.bookAIContent.update({
        where: { bookId },
        data: { ...content, lastUpdated: new Date() } as any
      });
      return convertPrismaBookAIContent(updated);
    } catch (error) {
      return null;
    }
  }

  async getAllBookAIContent(): Promise<BookAIContent[]> {
    if (!prisma) return [];
    const contents = await prisma.bookAIContent.findMany({
      orderBy: { lastUpdated: 'desc' }
    });
    return contents.map(convertPrismaBookAIContent);
  }

  // AI Analytics methods - MongoDB implementation
  async createAIAnalytics(analytics: InsertAIAnalytics): Promise<AIAnalytics> {
    if (!prisma) throw new Error("Database not available");
    const created = await prisma.aIAnalytics.create({
      data: analytics as any
    });
    return convertPrismaAIAnalytics(created);
  }

  async getAIAnalyticsByType(type: string): Promise<AIAnalytics[]> {
    if (!prisma) return [];
    const analytics = await prisma.aIAnalytics.findMany({
      where: { type },
      orderBy: { generatedAt: 'desc' }
    });
    return analytics.map(convertPrismaAIAnalytics);
  }

  async getAllAIAnalytics(): Promise<AIAnalytics[]> {
    if (!prisma) return [];
    const analytics = await prisma.aIAnalytics.findMany({
      orderBy: { generatedAt: 'desc' }
    });
    return analytics.map(convertPrismaAIAnalytics);
  }

  async deleteOldAIAnalytics(cutoffDate: Date): Promise<number> {
    if (!prisma) return 0;
    const result = await prisma.aIAnalytics.deleteMany({
      where: {
        generatedAt: { lt: cutoffDate }
      }
    });
    return result.count;
  }

  // AI Prediction methods - MongoDB implementation
  async createAIPrediction(prediction: InsertAIPrediction): Promise<AIPrediction> {
    if (!prisma) throw new Error("Database not available");
    const created = await prisma.aIPrediction.create({
      data: prediction as any
    });
    return convertPrismaAIPrediction(created);
  }

  async getAIPredictionsByType(type: string): Promise<AIPrediction[]> {
    if (!prisma) return [];
    const predictions = await prisma.aIPrediction.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' }
    });
    return predictions.map(convertPrismaAIPrediction);
  }

  async getAIPredictionsByTarget(targetId: string): Promise<AIPrediction[]> {
    if (!prisma) return [];
    const predictions = await prisma.aIPrediction.findMany({
      where: { targetId },
      orderBy: { createdAt: 'desc' }
    });
    return predictions.map(convertPrismaAIPrediction);
  }

  async getAllAIPredictions(): Promise<AIPrediction[]> {
    if (!prisma) return [];
    const predictions = await prisma.aIPrediction.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return predictions.map(convertPrismaAIPrediction);
  }

  async deleteOldAIPredictions(cutoffDate: Date): Promise<number> {
    if (!prisma) return 0;
    const result = await prisma.aIPrediction.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    return result.count;
  }

  // Chat Session methods
  async getChatSession(userId: string): Promise<ChatSession | null> {
    const session = await (prisma as any).chatSession.findUnique({
      where: { userId }
    });
    if (!session) return null;
    
    return {
      id: session.id,
      userId: session.userId,
      messages: Array.isArray(session.messages) ? session.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      })) : [],
      lastActivity: session.lastActivity,
      createdAt: session.createdAt
    };
  }

  async createChatSession(sessionData: InsertChatSession): Promise<ChatSession> {
    const session = await (prisma as any).chatSession.create({
      data: {
        userId: sessionData.userId,
        messages: sessionData.messages,
        lastActivity: new Date(),
        createdAt: new Date()
      }
    });
    
    return {
      id: session.id,
      userId: session.userId,
      messages: Array.isArray(session.messages) ? session.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      })) : [],
      lastActivity: session.lastActivity,
      createdAt: session.createdAt
    };
  }

  async updateChatSession(userId: string, messages: ChatMessage[]): Promise<ChatSession | null> {
    try {
      const session = await (prisma as any).chatSession.upsert({
        where: { userId },
        update: {
          messages: messages,
          lastActivity: new Date()
        },
        create: {
          userId: userId,
          messages: messages,
          lastActivity: new Date(),
          createdAt: new Date()
        }
      });
      
      return {
        id: session.id,
        userId: session.userId,
        messages: Array.isArray(session.messages) ? session.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        })) : [],
        lastActivity: session.lastActivity,
        createdAt: session.createdAt
      };
    } catch (error) {
      console.error('Error updating chat session:', error);
      return null;
    }
  }

  async clearChatSession(userId: string): Promise<boolean> {
    try {
      await (prisma as any).chatSession.delete({
        where: { userId }
      });
      return true;
    } catch (error) {
      console.error('Error clearing chat session:', error);
      return false;
    }
  }
}

// Use DatabaseStorage if MongoDB URI is available, otherwise fallback to MemStorage
export const storage = process.env.MONGODB_URI ? new DatabaseStorage() : new MemStorage();