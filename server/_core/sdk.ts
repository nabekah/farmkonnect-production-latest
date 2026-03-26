// JWT-based session management for FarmKonnect
// Authentication: username/password + Google OAuth

import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { getUserById } from "../db";
import { getDb } from "../db";
import { tokenBlacklist } from "../../drizzle/schema";
import { eq, lt } from "drizzle-orm";

export type SessionPayload = {
  userId: string;
  email: string;
  role: string;
};

class SessionService {
  private secret: Uint8Array;

  constructor() {
    const secretKey = ENV.jwtSecret || "default-secret-key";
    this.secret = new TextEncoder().encode(secretKey);
    console.log("[Session] JWT session service initialized");
  }

  async createSessionToken(userId: string, payload: Partial<SessionPayload>): Promise<string> {
    const token = await new SignJWT({
      userId,
      ...payload,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(this.secret);

    return token;
  }

  async verifySessionToken(token: string): Promise<SessionPayload> {
    try {
      // Check if token is in blacklist BEFORE verifying (logged out)
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        console.log("[Session] Token is blacklisted");
        return null as any; // Return null to indicate logged out
      }
      
      const verified = await jwtVerify(token, this.secret);
      const payload = verified.payload as SessionPayload;
      
      return payload;
    } catch (error) {
      console.error("[Session] Token verification failed:", error);
      return null as any; // Return null on any error
    }
  }

  async blacklistToken(token: string, userId: string): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.error("[Session] No database connection available for blacklisting");
        return;
      }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      await db.insert(tokenBlacklist).values({
        token,
        userId: parseInt(userId),
        expiresAt,
      });
      console.log("[Session] Token blacklisted in database");
    } catch (error) {
      console.error("[Session] Failed to blacklist token:", error);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;
      
      // Check if token is in blacklist
      const result = await db.select().from(tokenBlacklist).where(eq(tokenBlacklist.token, token)).limit(1);
      return result.length > 0;
    } catch (error) {
      console.error("[Session] Failed to check blacklist:", error);
      return false;
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;
      
      // Clean up expired tokens (run periodically)
      // For now, this is a no-op as we rely on database cleanup
      console.log("[Session] Cleanup expired tokens (scheduled)");
    } catch (error) {
      console.error("[Session] Failed to cleanup expired tokens:", error);
    }
  }
}

export const sessionService = new SessionService();

// Backward compatibility export used by context.ts
export const sdk = {
  authenticateRequest: async (req: any) => {
    const token = req.cookies?.session;
    if (!token) {
      return null;
    }
    try {
      const payload = await sessionService.verifySessionToken(token);
      if (!payload) {
        // Token is blacklisted or invalid
        return null;
      }
      const user = await getUserById(payload.userId);
      return user || null;
    } catch (error) {
      console.error("[Session] Auth request failed:", error);
      return null;
    }
  },
};
