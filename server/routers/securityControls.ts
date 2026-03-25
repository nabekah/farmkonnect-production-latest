import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const securityControlsRouter = router({
  // IP Whitelist Management
  addIPToWhitelist: protectedProcedure
    .input(z.object({
      farmId: z.string(),
      ipAddress: z.string(),
      description: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Verify user is admin or manager
        const userRole = await db.execute(sql`SELECT fw.role FROM farm_workers fw
           WHERE fw.userId = ${ctx.user.id}} AND fw.farmId = ${parseInt(input.farmId)}} AND fw.status = 'active'`);

        if (!userRole || userRole.length === 0 || !["admin", "manager"].includes(userRole[0].role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage IP whitelist"
          });
        }

        await db.execute(sql`INSERT INTO ip_whitelist (userId, farmId, ipAddress, description)
           VALUES (${ctx.user.id}}, ${parseInt(input.farmId)}}, ${input.ipAddress}}, ${input.description || null}})
           ON DUPLICATE KEY UPDATE description = VALUES(description), updatedAt = NOW()`);

        return { success: true, message: "IP added to whitelist" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error adding IP to whitelist:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add IP to whitelist"
        });
      }
    }),

  // Get whitelisted IPs
  getWhitelistedIPs: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const ips = await db.execute(sql`SELECT id, ipAddress, description, isActive, lastUsedAt
           FROM ip_whitelist
           WHERE userId = ${ctx.user.id}} AND farmId = ${parseInt(input.farmId)}}
           ORDER BY createdAt DESC`);

        return ips || [];
      } catch (error) {
        console.error("Error fetching whitelisted IPs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch whitelisted IPs"
        });
      }
    }),

  // Remove IP from whitelist
  removeIPFromWhitelist: protectedProcedure
    .input(z.object({ ipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        await db.execute(sql`DELETE FROM ip_whitelist WHERE id = ${input.ipId}} AND userId = ${ctx.user.id}}`);

        return { success: true, message: "IP removed from whitelist" };
      } catch (error) {
        console.error("Error removing IP from whitelist:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove IP from whitelist"
        });
      }
    }),

  // Geofencing Management
  createGeofence: protectedProcedure
    .input(z.object({
      farmId: z.string(),
      zoneName: z.string(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      radiusMeters: z.number().default(1000),
      alertOnExit: z.boolean().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Verify user is admin or manager
        const userRole = await db.execute(sql`SELECT fw.role FROM farm_workers fw
           WHERE fw.userId = ${ctx.user.id}} AND fw.farmId = ${parseInt(input.farmId)}} AND fw.status = 'active'`);

        if (!userRole || userRole.length === 0 || !["admin", "manager"].includes(userRole[0].role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create geofences"
          });
        }

        await db.execute(sql`INSERT INTO geofence_zones (userId, farmId, zoneName, latitude, longitude, radiusMeters, alertOnExit)
           VALUES (${ctx.user.id}}, ${parseInt(input.farmId)}}, ${input.zoneName}}, ${input.latitude}}, ${input.longitude}}, ${input.radiusMeters}}, ${input.alertOnExit}})`);

        return { success: true, message: "Geofence created successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error creating geofence:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create geofence"
        });
      }
    }),

  // Get geofences
  getGeofences: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const geofences = await db.execute(sql`SELECT id, zoneName, latitude, longitude, radiusMeters, isActive, alertOnExit
           FROM geofence_zones
           WHERE userId = ${ctx.user.id}} AND farmId = ${parseInt(input.farmId)}}
           ORDER BY createdAt DESC`);

        return geofences || [];
      } catch (error) {
        console.error("Error fetching geofences:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch geofences"
        });
      }
    }),

  // Check if user is within geofence
  checkGeofenceStatus: protectedProcedure
    .input(z.object({
      farmId: z.string(),
      latitude: z.number().optional(),
      longitude: z.number().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const geofences = await db.execute(sql`SELECT id, zoneName, latitude, longitude, radiusMeters, alertOnExit
           FROM geofence_zones
           WHERE farmId = ${parseInt(input.farmId)}} AND isActive = TRUE`);

        const status = geofences?.map((zone: any) => {
          const distance = calculateDistance(
            input.latitude,
            input.longitude,
            parseFloat(zone.latitude),
            parseFloat(zone.longitude)
          );
          const isInside = distance <= zone.radiusMeters;
          return {
            zoneId: zone.id,
            zoneName: zone.zoneName,
            isInside,
            distance: Math.round(distance),
            radiusMeters: zone.radiusMeters
          };
        }) || [];

        return status;
      } catch (error) {
        console.error("Error checking geofence status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check geofence status"
        });
      }
    }),

  // Verify IP is whitelisted
  verifyIPAccess: protectedProcedure
    .input(z.object({
      farmId: z.string(),
      ipAddress: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const whitelisted = await db.execute(sql`SELECT id FROM ip_whitelist
           WHERE farmId = ${parseInt(input.farmId)}} AND ipAddress = ${input.ipAddress}} AND isActive = TRUE`);

        if (!whitelisted || whitelisted.length === 0) {
          return { allowed: false, message: "IP address not whitelisted" };
        }

        // Update last used timestamp
        await db.execute(sql`UPDATE ip_whitelist SET lastUsedAt = NOW() WHERE id = ${whitelisted[0].id}}`);

        return { allowed: true, message: "IP address is whitelisted" };
      } catch (error) {
        console.error("Error verifying IP access:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify IP access"
        });
      }
    })
});
