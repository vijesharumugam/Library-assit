import { prisma } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { Role } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedDefaultUsers() {
  console.log("Checking for existing users...");
  
  try {
    // Check if admin exists
    const adminExists = await prisma.user.findUnique({
      where: { username: "admin123" }
    });

    if (!adminExists) {
      console.log("Creating default admin user...");
      await prisma.user.create({
        data: {
          username: "admin123",
          email: "admin@library.com",
          fullName: "System Administrator",
          password: await hashPassword("admin@123"),
          role: Role.ADMIN
        }
      });
      console.log("✓ Admin user created: admin123 / admin@123");
    } else {
      console.log("✓ Admin user already exists");
    }

    // Check if librarian exists
    const librarianExists = await prisma.user.findUnique({
      where: { username: "Lib123" }
    });

    if (!librarianExists) {
      console.log("Creating default librarian user...");
      await prisma.user.create({
        data: {
          username: "Lib123",
          email: "librarian@library.com",
          fullName: "Library Staff",
          password: await hashPassword("Libpass123"),
          role: Role.LIBRARIAN
        }
      });
      console.log("✓ Librarian user created: Lib123 / Libpass123");
    } else {
      console.log("✓ Librarian user already exists");
    }

    // List all users
    const allUsers = await prisma.user.findMany({
      select: { username: true, email: true, role: true }
    });
    
    console.log("\nCurrent users:");
    allUsers.forEach(user => {
      console.log(`- ${user.username} (${user.role}) - ${user.email}`);
    });
    
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDefaultUsers();
}

export { seedDefaultUsers };