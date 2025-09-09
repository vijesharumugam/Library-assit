import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { PushNotificationService } from "./push-service";
import { insertBookSchema, insertTransactionSchema, insertBookRequestSchema, insertNotificationSchema, insertPushSubscriptionSchema, insertExtensionRequestSchema, updateProfileSchema, TransactionStatus, BookRequestStatus, NotificationType, ExtensionRequestStatus } from "@shared/schema";
import { z } from "zod";
import { prisma } from "./db";
import multer from "multer";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { LibraryAIService } from "./ai-service";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Initialize Google Gemini AI client for intelligent search
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  // Initialize AI Service
  const aiService = new LibraryAIService();

  // Configure multer for file uploads (for Excel files)
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });

  // Configure multer for profile picture uploads
  const profileUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
      }
    },
    limits: {
      fileSize: 2 * 1024 * 1024 // 2MB limit
    }
  });

  // Book routes
  app.get("/api/books", requireAuth, async (req, res) => {
    try {
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.get("/api/books/available", requireAuth, async (req, res) => {
    try {
      const books = await storage.getAvailableBooks();
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available books" });
    }
  });

  app.post("/api/books", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const bookData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(bookData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid book data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create book" });
    }
  });

  app.put("/api/books/:id", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const bookData = insertBookSchema.partial().parse(req.body);
      const book = await storage.updateBook(req.params.id, bookData);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid book data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const deleted = await storage.deleteBook(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Bulk upload books from Excel
  app.post("/api/books/bulk-upload", requireRole(["LIBRARIAN", "ADMIN"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        return res.status(400).json({ message: "Excel file is empty" });
      }

      const books = [];
      const errors = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        try {
          // Map Excel columns to book schema (flexible column naming)
          const bookData = {
            title: row.Title || row.title || row.TITLE || row['Book Title'] || '',
            author: row.Author || row.author || row.AUTHOR || '',
            isbn: row.ISBN || row.isbn || row.Isbn || row['ISBN Number'] || '',
            category: row.Category || row.category || row.CATEGORY || '',
            description: row.Description || row.description || row.DESCRIPTION || '',
            publisher: row.Publisher || row.publisher || row.PUBLISHER || '',
            totalCopies: parseInt(row['Total Copies'] || row.TotalCopies || row.totalCopies || row.Copies || row.copies || '1')
          };

          // Validate using schema
          const validatedBook = insertBookSchema.parse(bookData);
          books.push(validatedBook);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : 'Invalid data'}`);
        }
      }

      if (errors.length > 0 && books.length === 0) {
        return res.status(400).json({ 
          message: "No valid books found in Excel file", 
          errors: errors.slice(0, 10) // Limit to first 10 errors
        });
      }

      // Bulk create books
      const createdBooks = [];
      const createErrors = [];

      for (const book of books) {
        try {
          const createdBook = await storage.createBook(book);
          createdBooks.push(createdBook);
        } catch (error) {
          createErrors.push(`Failed to create book "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: `Successfully imported ${createdBooks.length} books`,
        imported: createdBooks.length,
        errors: errors.concat(createErrors),
        books: createdBooks
      });

    } catch (error) {
      console.error('Excel upload error:', error);
      res.status(500).json({ 
        message: "Failed to process Excel file",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI-powered intelligent search endpoint with fallback to regular search
  app.get("/api/books/search/intelligent", requireAuth, async (req, res) => {
    try {
      const { query } = req.query as { query?: string };
      
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Get all available books
      const books = await storage.getAvailableBooks();
      
      if (books.length === 0) {
        return res.json([]);
      }

      // For now, use enhanced fallback search as the main AI search is too slow
      // TODO: Implement proper caching or batch processing for Gemini embeddings
      console.log(`Using enhanced search for query: "${query.trim()}" (AI embeddings too slow)`);
      return performEnhancedFallbackSearch(books, query.trim(), res);
    } catch (error) {
      console.error('Intelligent search error:', error);
      // Fallback to regular search instead of returning error
      try {
        const books = await storage.getAvailableBooks();
        return performFallbackSearch(books, (req.query.query as string)?.trim() || '', res);
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        res.status(500).json({ message: "Search functionality is temporarily unavailable" });
      }
    }
  });

  // Enhanced fallback search function with intelligent keyword matching and scoring
  function performEnhancedFallbackSearch(books: any[], query: string, res: any) {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    // Create semantic synonyms for common terms
    const synonyms: { [key: string]: string[] } = {
      'science': ['physics', 'chemistry', 'biology', 'scientific', 'research'],
      'mystery': ['detective', 'crime', 'thriller', 'suspense'],
      'history': ['historical', 'past', 'ancient', 'medieval'],
      'technology': ['tech', 'computer', 'programming', 'software'],
      'fiction': ['novel', 'story', 'narrative'],
      'romance': ['love', 'romantic'],
      'adventure': ['action', 'journey', 'expedition'],
      'fantasy': ['magic', 'magical', 'dragons', 'wizards'],
      'biography': ['life', 'memoir', 'autobiography'],
      'business': ['management', 'entrepreneur', 'corporate', 'finance']
    };

    const results = books.filter(book => {
      const searchableText = `${book.title} ${book.author} ${book.category} ${book.description || ''} ${book.publisher || ''}`.toLowerCase();
      
      // Check for direct matches
      const directMatch = searchTerms.some(term => searchableText.includes(term));
      
      // Check for synonym matches
      const synonymMatch = searchTerms.some(term => {
        const termSynonyms = synonyms[term] || [];
        return termSynonyms.some(synonym => searchableText.includes(synonym));
      });
      
      return directMatch || synonymMatch;
    });

    // Advanced scoring system
    const sortedResults = results.map(book => {
      const searchableText = `${book.title} ${book.author} ${book.category} ${book.description || ''} ${book.publisher || ''}`.toLowerCase();
      let score = 0;
      
      searchTerms.forEach(term => {
        // Title match (highest weight)
        if (book.title.toLowerCase().includes(term)) score += 10;
        
        // Author match (high weight)
        if (book.author.toLowerCase().includes(term)) score += 8;
        
        // Category exact match (high weight)
        if (book.category.toLowerCase() === term) score += 7;
        if (book.category.toLowerCase().includes(term)) score += 5;
        
        // Description match (medium weight)
        if (book.description && book.description.toLowerCase().includes(term)) score += 3;
        
        // Publisher match (low weight)
        if (book.publisher && book.publisher.toLowerCase().includes(term)) score += 1;
        
        // Synonym matches (medium weight)
        const termSynonyms = synonyms[term] || [];
        termSynonyms.forEach(synonym => {
          if (searchableText.includes(synonym)) score += 4;
        });
        
        // Partial word matches (lower weight)
        if (searchableText.includes(term.substring(0, Math.max(3, term.length - 2)))) score += 2;
      });
      
      return { book, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(item => item.book);

    console.log(`Enhanced search found ${sortedResults.length} results for "${query}"`);
    res.json(sortedResults);
  }

  // Fallback search function that performs regular text-based search
  function performFallbackSearch(books: any[], query: string, res: any) {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    const results = books.filter(book => {
      const searchableText = `${book.title} ${book.author} ${book.category} ${book.description || ''} ${book.publisher || ''}`.toLowerCase();
      
      // Return books that contain any of the search terms
      return searchTerms.some(term => searchableText.includes(term));
    });

    // Sort results by relevance (number of matching terms)
    const sortedResults = results.map(book => {
      const searchableText = `${book.title} ${book.author} ${book.category} ${book.description || ''} ${book.publisher || ''}`.toLowerCase();
      const matchCount = searchTerms.reduce((count, term) => {
        return count + (searchableText.includes(term) ? 1 : 0);
      }, 0);
      return { book, matchCount };
    })
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 20)
    .map(item => item.book);

    res.json(sortedResults);
  }

  // Utility function to calculate cosine similarity between two vectors
  function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Transaction routes
  app.get("/api/transactions", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/active", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const transactions = await storage.getActiveTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active transactions" });
    }
  });

  app.get("/api/transactions/user/:userId", requireAuth, async (req, res) => {
    try {
      // Users can only view their own transactions unless they're librarian/admin
      if (req.user!.id !== req.params.userId && !["LIBRARIAN", "ADMIN"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const transactions = await storage.getUserTransactions(req.params.userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user transactions" });
    }
  });

  app.get("/api/transactions/my", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getUserTransactions(req.user!.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch your transactions" });
    }
  });

  // Book Request routes (for students)
  app.post("/api/book-requests", requireAuth, async (req, res) => {
    try {
      const { bookId, notes } = req.body;
      
      if (!bookId) {
        return res.status(400).json({ message: "Book ID is required" });
      }

      // Check if book exists
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      // Students can only request books
      if (req.user!.role !== "STUDENT") {
        return res.status(403).json({ message: "Only students can request books" });
      }

      const requestData = {
        userId: req.user!.id,
        bookId,
        requestedBy: req.user!.fullName,
        notes: notes || "",
        status: BookRequestStatus.PENDING,
      };

      const request = await storage.createBookRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to create book request" });
    }
  });

  app.get("/api/book-requests/my", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getBookRequestsByUser(req.user!.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch book requests" });
    }
  });

  app.get("/api/book-requests", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const requests = await storage.getAllBookRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch book requests" });
    }
  });

  app.get("/api/book-requests/pending", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const requests = await storage.getPendingBookRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.post("/api/book-requests/:id/approve", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const transaction = await storage.approveBookRequest(req.params.id, req.user!.id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Request not found or cannot be approved" });
      }

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve book request" });
    }
  });

  app.post("/api/book-requests/:id/reject", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const request = await storage.rejectBookRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject book request" });
    }
  });

  // Extension Request routes
  // Create a new extension request (students only)
  app.post("/api/extension-requests", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "STUDENT") {
        return res.status(403).json({ message: "Only students can create extension requests" });
      }

      const data = insertExtensionRequestSchema.parse({
        ...req.body,
        userId: req.user!.id,
        currentDueDate: new Date(req.body.currentDueDate),
        requestedDueDate: new Date(req.body.requestedDueDate)
      });

      const extensionRequest = await storage.createExtensionRequest(data);
      res.status(201).json(extensionRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid extension request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create extension request" });
    }
  });

  // Get extension requests for current user (students)
  app.get("/api/extension-requests/my", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getExtensionRequestsByUser(req.user!.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch extension requests" });
    }
  });

  // Get all extension requests (librarians/admins)
  app.get("/api/extension-requests", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const requests = await storage.getAllExtensionRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch extension requests" });
    }
  });

  // Get pending extension requests (librarians/admins)
  app.get("/api/extension-requests/pending", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const requests = await storage.getPendingExtensionRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending extension requests" });
    }
  });

  // Approve an extension request (librarians/admins)
  app.post("/api/extension-requests/:id/approve", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const request = await storage.approveExtensionRequest(req.params.id, req.user!.username);
      if (!request) {
        return res.status(404).json({ message: "Extension request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve extension request" });
    }
  });

  // Reject an extension request (librarians/admins)
  app.post("/api/extension-requests/:id/reject", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const request = await storage.rejectExtensionRequest(req.params.id, req.user!.username);
      if (!request) {
        return res.status(404).json({ message: "Extension request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject extension request" });
    }
  });

  app.post("/api/transactions/:id/return", requireAuth, async (req, res) => {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id }
      });

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Only librarians and admins can return books
      if (!["LIBRARIAN", "ADMIN"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Access denied. Only librarians and administrators can process book returns." });
      }

      const updatedTransaction = await storage.updateTransactionStatus(
        req.params.id,
        TransactionStatus.RETURNED,
        new Date()
      );

      if (updatedTransaction) {
        // Update book availability
        await storage.updateBookAvailability(transaction.bookId, 1);
      }

      res.json(updatedTransaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to return book" });
    }
  });

  // Profile routes
  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const profileData = updateProfileSchema.parse(req.body);
      const user = await storage.updateProfile(req.user!.id, profileData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/profile/picture", requireAuth, profileUpload.single('picture'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      // Convert image to base64 for storage
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      const user = await storage.updateProfile(req.user!.id, { 
        profilePicture: base64Image 
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ profilePicture: user.profilePicture });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", requireRole(["ADMIN"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all students (for librarians to borrow books)
  app.get("/api/students", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Direct borrow transaction (librarian creates borrow for student)
  app.post("/api/transactions/borrow", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        dueDate: new Date(req.body.dueDate)
      });
      
      const transaction = await storage.createTransaction(transactionData);
      if (!transaction) {
        return res.status(400).json({ message: "Failed to create transaction - book may not be available" });
      }
      
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create borrow transaction" });
    }
  });

  app.put("/api/users/:id/role", requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { role } = req.body;
      
      if (!["STUDENT", "LIBRARIAN", "ADMIN"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(req.params.id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete("/api/users/:id", requireRole(["ADMIN"]), async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", requireRole(["LIBRARIAN", "ADMIN"]), async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      
      // Send push notification
      await PushNotificationService.sendNotificationToUser(notification.userId, {
        title: notification.title,
        message: notification.message,
        type: notification.type as any
      });
      
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid notification data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const success = await storage.markAllNotificationsAsRead(req.user!.id);
      if (!success) {
        return res.status(500).json({ message: "Failed to mark all notifications as read" });
      }
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/clear-all", requireAuth, async (req, res) => {
    try {
      const success = await storage.clearAllNotifications(req.user!.id);
      if (!success) {
        return res.status(500).json({ message: "Failed to clear all notifications" });
      }
      res.json({ message: "All notifications cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear all notifications" });
    }
  });

  // AI Chat Assistant endpoint for students
  app.post("/api/ai-chat", requireRole(["STUDENT"]), async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      const user = req.user! as any;
      const aiResponse = await aiService.processUserQuery(user, message);
      
      res.json(aiResponse);
    } catch (error) {
      console.error('AI Chat Error:', error);
      res.status(500).json({ 
        response: "I'm sorry, I'm experiencing technical difficulties. Please try again later or contact library staff for assistance.",
        message: "AI service temporarily unavailable" 
      });
    }
  });

  // Clear AI Chat history when user closes chat
  app.delete("/api/ai-chat/history", requireRole(["STUDENT"]), async (req, res) => {
    try {
      const user = req.user! as any;
      aiService.clearChatHistory(user.id);
      
      res.json({ message: "Chat history cleared successfully" });
    } catch (error) {
      console.error('Clear Chat History Error:', error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Push Subscription routes
  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const subscriptionData = insertPushSubscriptionSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const subscription = await storage.createPushSubscription(subscriptionData);
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid subscription data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create push subscription" });
    }
  });

  app.delete("/api/push/unsubscribe/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deletePushSubscription(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete push subscription" });
    }
  });

  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ 
      publicKey: process.env.VAPID_PUBLIC_KEY || "" 
    });
  });

  // Test push notification endpoint (for admin testing)
  app.post("/api/push/test", requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { userId, title, message } = req.body;
      
      if (userId) {
        await PushNotificationService.sendNotificationToUser(userId, {
          title: title || "Test Notification",
          message: message || "This is a test push notification from the library system.",
          type: "BOOK_BORROWED" as any
        });
      } else {
        await PushNotificationService.sendNotificationToAllUsers({
          title: title || "Test Notification",
          message: message || "This is a test push notification from the library system.",
          type: "BOOK_BORROWED" as any
        });
      }

      res.json({ message: "Test push notification sent successfully" });
    } catch (error) {
      console.error('Test push notification error:', error);
      res.status(500).json({ message: "Failed to send test push notification" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}