import { count } from "drizzle-orm";
import { db } from "@/db/client";
import {
  account,
  assessments,
  auditEvents,
  departments,
  ropaActivities,
  session,
  user,
  users,
  verification,
} from "@/db/schema";

let initialized = false;
let initializationPromise: Promise<void> | null = null;

export async function ensureDatabase() {
  if (initialized) {
    return;
  }

  initializationPromise ??= initializeDatabase();

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

async function initializeDatabase() {
  const [existing] = await db.select({ value: count() }).from(departments);

  if ((existing?.value ?? 0) === 0) {
    await seedDatabase();
  }

  initialized = true;
}

export async function resetAndSeedDatabase() {
  await db.delete(auditEvents);
  await db.delete(assessments);
  await db.delete(ropaActivities);
  await db.delete(users);
  await db.delete(verification);
  await db.delete(account);
  await db.delete(session);
  await db.delete(user);
  await db.delete(departments);
  await seedDatabase();
  initialized = true;
  initializationPromise = Promise.resolve();
}

async function seedDatabase() {
  const now = new Date().toISOString();

  await db.insert(departments).values([
    { id: "dept-hr", name: "Human Resources", createdAt: now },
    { id: "dept-marketing", name: "Marketing", createdAt: now },
    { id: "dept-finance", name: "Finance", createdAt: now },
    { id: "dept-product", name: "Product Development", createdAt: now },
    { id: "dept-legal", name: "Legal Team", createdAt: now },
  ]);

  await db.insert(users).values([
    {
      id: "user-admin",
      fullName: "Nadia Pratama",
      email: "admin@privacyvault.local",
      role: "Admin",
      departmentId: "dept-legal",
      createdAt: now,
    },
    {
      id: "user-pic-hr",
      fullName: "Sarah Connor",
      email: "sarah@privacyvault.local",
      role: "PIC",
      departmentId: "dept-hr",
      createdAt: now,
    },
    {
      id: "user-pic-marketing",
      fullName: "Bima Santoso",
      email: "bima@privacyvault.local",
      role: "PIC",
      departmentId: "dept-marketing",
      createdAt: now,
    },
  ]);

  const authNow = new Date();
  await db.insert(user).values([
    {
      id: "auth-admin",
      name: "Nadia Pratama",
      email: "admin@privacyvault.local",
      emailVerified: true,
      image: null,
      role: "Admin",
      departmentId: "dept-legal",
      createdAt: authNow,
      updatedAt: authNow,
    },
    {
      id: "auth-pic-hr",
      name: "Sarah Connor",
      email: "sarah@privacyvault.local",
      emailVerified: true,
      image: null,
      role: "PIC",
      departmentId: "dept-hr",
      createdAt: authNow,
      updatedAt: authNow,
    },
  ]);
}
