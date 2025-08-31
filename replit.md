# Library Management System

## Overview

This is a full-stack library management system built with React, Express, and MongoDB Atlas (MEAN stack). The application provides role-based access control for students, librarians, and administrators to manage books, track borrowing transactions, and oversee library operations. Students can browse and borrow books, librarians can manage the book catalog and transactions, while administrators have full system control including user management and role assignments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Context-based auth provider with protected routes

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy using session-based auth
- **Password Security**: Node.js crypto module with scrypt for password hashing
- **Session Management**: Express sessions with MongoDB session store
- **API Design**: RESTful API with role-based authorization middleware
- **Error Handling**: Centralized error handling with proper HTTP status codes

### Database Layer
- **Database**: MongoDB Atlas cloud database
- **ORM**: Prisma ORM for type-safe database operations
- **Schema Management**: Prisma schema management and migrations
- **Connection**: Direct connection to MongoDB Atlas cluster

### Data Models
- **Users**: Contains authentication data, roles (student/librarian/admin), and profile information
- **Books**: Catalog with title, author, ISBN, category, availability tracking
- **Transactions**: Borrowing records linking users and books with status tracking

### Authentication & Authorization
- **Session-based Authentication**: Using express-session with MongoDB store
- **Role-based Access Control**: Three-tier system (student, librarian, admin)
- **Protected Routes**: Frontend route protection based on user roles
- **Password Security**: Salted hashing using Node.js scrypt implementation
- **Default Accounts**: Librarian (Lib123/Libpass123), Admin (admin123/admin@123)

### Security Features
- **CSRF Protection**: Trust proxy configuration for secure sessions
- **Input Validation**: Zod schemas for both client and server-side validation
- **NoSQL Injection Prevention**: Secure queries through Prisma ORM with MongoDB
- **Session Security**: Secure session configuration with proper cookie settings

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18 with TypeScript, Vite for development and building
- **Express.js**: Web framework with TypeScript support via tsx
- **MongoDB Atlas**: Cloud-hosted MongoDB database service

### UI and Styling
- **Shadcn/ui**: Complete UI component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography

### Authentication & Security
- **Passport.js**: Authentication middleware with local strategy
- **Express Session**: Session management with connect-mongo for MongoDB storage
- **Node.js Crypto**: Built-in cryptographic functions for password security

### Database & ORM
- **Prisma ORM**: Type-safe ORM with MongoDB support
- **Prisma Client**: Auto-generated and type-safe database client
- **MongoDB Atlas**: Cloud-hosted MongoDB database service

### State Management & Forms
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Zod**: Runtime type validation and schema definition

### Development Tools
- **TypeScript**: Static type checking across the entire stack
- **ESBuild**: Fast bundling for production server builds
- **Replit Integration**: Development environment with runtime error handling