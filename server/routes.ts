import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBookSchema, insertTransactionSchema, insertBookRequestSchema, TransactionStatus, BookRequestStatus } from "@shared/schema";
import { z } from "zod";
import { prisma } from "./db";

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
      const request = await storage.updateBookRequestStatus(req.params.id, BookRequestStatus.REJECTED);
      
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

      // Check if user owns this transaction or has librarian/admin privileges
      if (transaction.userId !== req.user!.id && !["LIBRARIAN", "ADMIN"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Access denied" });
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

  // User management routes (admin only)
  app.get("/api/users", requireRole(["ADMIN"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
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

  const httpServer = createServer(app);
  return httpServer;
}