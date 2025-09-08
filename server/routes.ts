import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBookSchema, insertTransactionSchema, insertBookRequestSchema, insertNotificationSchema, updateProfileSchema, TransactionStatus, BookRequestStatus, NotificationType } from "@shared/schema";
import { z } from "zod";
import { prisma } from "./db";
import multer from "multer";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

      // Check if Gemini API key is available
      if (!process.env.GEMINI_API_KEY) {
        console.warn('Gemini API key not available, falling back to regular search');
        return performFallbackSearch(books, query.trim(), res);
      }

      try {
        // Get the text embedding model
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

        // Generate embedding for the user's search query
        const queryResult = await model.embedContent(query.trim());
        const queryEmbedding = queryResult.embedding.values;

        // Calculate similarity scores for each book
        const bookScores: Array<{ book: any, score: number }> = [];
        
        for (const book of books) {
          try {
            // Create a searchable text representation of the book
            const bookText = `${book.title} ${book.author} ${book.category} ${book.description || ''} ${book.publisher || ''}`;
            
            // Generate embedding for the book
            const bookResult = await model.embedContent(bookText);
            const bookEmbedding = bookResult.embedding.values;

            // Calculate cosine similarity
            const similarity = calculateCosineSimilarity(queryEmbedding, bookEmbedding);

            bookScores.push({ book, score: similarity });
          } catch (bookError) {
            // If individual book embedding fails, skip this book but continue
            console.warn(`Failed to process book "${book.title}":`, bookError);
          }
        }

        // Sort by similarity score (descending) and return top results
        const sortedBooks = bookScores
          .sort((a, b) => b.score - a.score)
          .slice(0, 20) // Return top 20 results
          .map(item => item.book);

        res.json(sortedBooks);
      } catch (geminiError: any) {
        // Handle specific Gemini API errors
        if (geminiError?.status === 429) {
          console.warn('Gemini API quota exceeded, falling back to regular search');
          return performFallbackSearch(books, query.trim(), res);
        } else if (geminiError?.status === 401 || geminiError?.status === 403) {
          console.warn('Gemini API authentication failed, falling back to regular search');
          return performFallbackSearch(books, query.trim(), res);
        } else {
          console.warn('Gemini API error, falling back to regular search:', geminiError.message);
          return performFallbackSearch(books, query.trim(), res);
        }
      }
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

  const httpServer = createServer(app);
  return httpServer;
}