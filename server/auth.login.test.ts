import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import bcrypt from "bcryptjs";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Authentication - Login/Logout", () => {
  let caller: any;
  let testUserId: string;
  const testEmail = "test-login@example.com";
  const testPassword = "TestPass@123456";

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create test user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(testPassword, salt);

    // Delete existing test user if any
    await db.delete(users).where(eq(users.email, testEmail));

    // Create new test user
    const result = await db.insert(users).values({
      username: "testlogin",
      email: testEmail,
      passwordHash,
      name: "Test Login User",
      role: "farmer",
      loginMethod: "local",
      emailVerified: true,
      approvalStatus: "approved",
      accountStatus: "active",
    });

    testUserId = String(result[0].insertId || "test-id");

    // Create mock context
    const mockReq = {
      cookies: {},
      headers: {},
    };
    const mockRes = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };

    caller = appRouter.createCaller({
      req: mockReq,
      res: mockRes,
      user: null,
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(users).where(eq(users.email, testEmail));
  });

  it("should login with valid credentials", async () => {
    const result = await caller.auth.loginWithPassword({
      usernameOrEmail: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Login successful!");
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
  });

  it("should fail login with invalid password", async () => {
    try {
      await caller.auth.loginWithPassword({
        usernameOrEmail: testEmail,
        password: "WrongPassword@123456",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toContain("Invalid username/email or password");
    }
  });

  it("should fail login with non-existent email", async () => {
    try {
      await caller.auth.loginWithPassword({
        usernameOrEmail: "nonexistent@example.com",
        password: testPassword,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toContain("Invalid username/email or password");
    }
  });

  it("should fail login if email not verified", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const unverifiedEmail = "unverified@example.com";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(testPassword, salt);

    // Create unverified user
    await db.insert(users).values({
      username: "unverified",
      email: unverifiedEmail,
      passwordHash,
      name: "Unverified User",
      role: "farmer",
      loginMethod: "local",
      emailVerified: false,  // Not verified
      approvalStatus: "approved",
      accountStatus: "active",
    });

    try {
      await caller.auth.loginWithPassword({
        usernameOrEmail: unverifiedEmail,
        password: testPassword,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toContain("verify your email");
    }

    // Cleanup
    await db.delete(users).where(eq(users.email, unverifiedEmail));
  });

  it("should fail login if account not approved", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const pendingEmail = "pending@example.com";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(testPassword, salt);

    // Create pending user
    await db.insert(users).values({
      username: "pending",
      email: pendingEmail,
      passwordHash,
      name: "Pending User",
      role: "farmer",
      loginMethod: "local",
      emailVerified: true,
      approvalStatus: "pending",  // Not approved
      accountStatus: "active",
    });

    try {
      await caller.auth.loginWithPassword({
        usernameOrEmail: pendingEmail,
        password: testPassword,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toContain("pending approval");
    }

    // Cleanup
    await db.delete(users).where(eq(users.email, pendingEmail));
  });

  it("should return current user with auth.me", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Get the test user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail));

    if (!user) throw new Error("Test user not found");

    // Create authenticated caller
    const authenticatedCaller = appRouter.createCaller({
      req: { cookies: {}, headers: {} },
      res: { cookie: vi.fn(), clearCookie: vi.fn() },
      user: user,
    });

    const result = await authenticatedCaller.auth.me();
    expect(result).toBeDefined();
    expect(result.email).toBe(testEmail);
  });

  it("should return null for auth.me when not authenticated", async () => {
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});
