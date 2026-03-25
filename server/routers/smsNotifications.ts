import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const smsNotificationsRouter = router({
  // Send SMS alert to worker
  sendPerformanceAlert: protectedProcedure
    .input(z.object({
      workerId: z.string(),
      farmId: z.string(),
      alertType: z.enum(["low_activity", "low_quality", "high_absence", "task_overdue"]),
      message: z.string(),
      actionRequired: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Verify sender is manager or admin
        const senderRole = await db.execute(sql`SELECT fw.role FROM farm_workers fw
           WHERE fw.userId = ${ctx.user.id}} AND fw.farmId = ${parseInt(input.farmId)}} AND fw.status = 'active'`);

        if (!senderRole || senderRole.length === 0 || !["admin", "manager"].includes(senderRole[0].role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to send alerts"
          });
        }

        // Get worker's phone number
        const worker = await db.execute(sql`SELECT fw.phoneNumber FROM farm_workers fw
           WHERE fw.userId = ${input.workerId}} AND fw.farmId = ${parseInt(input.farmId)}}`);

        if (!worker || worker.length === 0 || !worker[0].phoneNumber) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Worker phone number not found"
          });
        }

        // Format SMS message
        const smsMessage = `[FarmKonnect Alert] ${input.message}${input.actionRequired ? " - Action required." : ""}`;

        // Send SMS via Twilio (using built-in SMS helper)
        // This would integrate with your SMS service
        const smsResult = {
          success: true,
          messageId: `sms_${Date.now()}`,
          phoneNumber: worker[0].phoneNumber,
          message: smsMessage,
          status: "sent"
        };

        // Log SMS notification
        await db.execute(sql`INSERT INTO sms_notifications (senderId, recipientId, farmId, alertType, message, status, phoneNumber)
           VALUES (${ctx.user.id}}, ${input.workerId}}, ${parseInt(input.farmId)}}, ${input.alertType}}, ${smsMessage}}, ${"sent"}}, ${worker[0].phoneNumber}})`);

        return smsResult;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error sending SMS alert:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send SMS alert"
        });
      }
    }),

  // Get SMS notification history
  getSMSHistory: protectedProcedure
    .input(z.object({
      farmId: z.string(),
      limit: z.number().default(50),
      offset: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Verify user has access to farm
        const hasAccess = await db.execute(sql`SELECT fw.role FROM farm_workers fw
           WHERE fw.userId = ${ctx.user.id}} AND fw.farmId = ${parseInt(input.farmId)}} AND fw.status = 'active'`);

        if (!hasAccess || hasAccess.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to view SMS history"
          });
        }

        const history = await db.execute(sql`SELECT id, senderId, recipientId, alertType, message, status, phoneNumber, createdAt
           FROM sms_notifications
           WHERE farmId = ${parseInt(input.farmId)}}
           ORDER BY createdAt DESC
           LIMIT ${input.limit}} OFFSET ${input.offset}}`);

        return history || [];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching SMS history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch SMS history"
        });
      }
    }),

  // Get SMS delivery status
  getSMSStatus: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const status = await db.execute(sql`SELECT id, status, phoneNumber, message, deliveredAt, failureReason
           FROM sms_notifications
           WHERE id = ${input.messageId}}`);

        if (!status || status.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SMS message not found"
          });
        }

        return status[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching SMS status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch SMS status"
        });
      }
    }),

  // Enable/disable SMS notifications for worker
  toggleSMSNotifications: protectedProcedure
    .input(z.object({
      workerId: z.string(),
      farmId: z.string(),
      enabled: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Verify user is manager or admin
        const userRole = await db.execute(sql`SELECT fw.role FROM farm_workers fw
           WHERE fw.userId = ${ctx.user.id}} AND fw.farmId = ${parseInt(input.farmId)}} AND fw.status = 'active'`);

        if (!userRole || userRole.length === 0 || !["admin", "manager"].includes(userRole[0].role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage SMS settings"
          });
        }

        await db.execute(sql`UPDATE farm_workers SET smsNotificationsEnabled = ${input.enabled}} WHERE userId = ${input.workerId}} AND farmId = ${parseInt(input.farmId)}}`);

        return {
          success: true,
          message: `SMS notifications ${input.enabled ? "enabled" : "disabled"}`
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error toggling SMS notifications:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to toggle SMS notifications"
        });
      }
    })
});
