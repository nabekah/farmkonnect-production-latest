/**
 * Field Worker Router
 * tRPC procedures for field worker operations
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { fieldWorkerTasks, taskHistory, users, fieldWorkerActivityLogs, taskComments } from '../../drizzle/schema';
import { emailNotifications } from '../_core/emailNotifications';
import { eq, desc, sql, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { broadcastToFarm } from '../_core/websocket';

export const fieldWorkerRouter = router({
  getTasks: protectedProcedure
    .input(z.object({
      farmId: z.number(),
      status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const tasks = await db
          .select({
            taskId: fieldWorkerTasks.taskId,
            farmId: fieldWorkerTasks.farmId,
            title: fieldWorkerTasks.title,
            description: fieldWorkerTasks.description,
            taskType: fieldWorkerTasks.taskType,
            priority: fieldWorkerTasks.priority,
            status: fieldWorkerTasks.status,
            dueDate: fieldWorkerTasks.dueDate,
            assignedToUserId: fieldWorkerTasks.assignedToUserId,
            fieldId: fieldWorkerTasks.fieldId,
            createdAt: fieldWorkerTasks.createdAt,
            updatedAt: fieldWorkerTasks.updatedAt,
            assignedWorkerName: users.name,
            assignedWorkerEmail: users.email,
          })
          .from(fieldWorkerTasks)
          .leftJoin(users, eq(fieldWorkerTasks.assignedToUserId, users.id))
          .where(eq(fieldWorkerTasks.farmId, input.farmId))
          .orderBy(desc(fieldWorkerTasks.createdAt));

        return tasks;
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch tasks',
        });
      }
    }),

  getTaskDetails: protectedProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const task = await db
          .select()
          .from(fieldWorkerTasks)
          .where(eq(fieldWorkerTasks.taskId, input.taskId))
          .limit(1);

        if (task.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
          });
        }

        return task[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Failed to fetch task details:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch task details',
        });
      }
    }),

  updateTaskStatus: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const now = new Date();
        await db
          .update(fieldWorkerTasks)
          .set({
            status: input.status,
            updatedAt: now,
          })
          .where(eq(fieldWorkerTasks.taskId, input.taskId));

        const historyId = uuidv4();
        await db.execute(
          sql`INSERT INTO taskHistory (historyId, taskId, userId, action, notes, createdAt)
              VALUES (${historyId}, ${input.taskId}, ${ctx.user.id}, ${input.status}, ${input.notes || null}, ${now})`
        );

        const updatedTask = await db
          .select()
          .from(fieldWorkerTasks)
          .where(eq(fieldWorkerTasks.taskId, input.taskId))
          .limit(1);

        if (updatedTask.length > 0) {
          broadcastToFarm(updatedTask[0].farmId, {
            type: 'task_updated',
            data: updatedTask[0],
            timestamp: now.toISOString(),
          });
        }

        return { success: true, message: 'Task status updated' };
      } catch (error) {
        console.error('Failed to update task status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update task status',
        });
      }
    }),

  getActivityLogs: protectedProcedure
    .input(z.object({
      farmId: z.number(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const logs = await db
          .select()
          .from(fieldWorkerActivityLogs)
          .where(eq(fieldWorkerActivityLogs.farmId, input.farmId))
          .orderBy(desc(fieldWorkerActivityLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return logs;
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch activity logs',
        });
      }
    }),

  getActivityLogDetails: protectedProcedure
    .input(z.object({
      logId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const logs = await db.execute(
          sql`SELECT * FROM fieldWorkerActivityLogs WHERE logId = ${input.logId}`
        );

        const logsArray = Array.isArray(logs) ? logs : [];
        if (logsArray.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity log not found',
          });
        }

        return logsArray[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Failed to fetch activity log details:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch activity log details',
        });
      }
    }),

  createActivityLog: protectedProcedure
    .input(z.object({
      farmId: z.number(),
      fieldId: z.number().optional(),
      activityType: z.string(),
      title: z.string(),
      description: z.string().optional(),
      observations: z.string().optional(),
      gpsLatitude: z.number().optional(),
      gpsLongitude: z.number().optional(),
      photoUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const logId = uuidv4();
      const now = new Date();

      try {
        const photoUrlsJson = JSON.stringify(input.photoUrls || []);
        
        await db.execute(
          sql`INSERT INTO fieldWorkerActivityLogs (
            logId, userId, farmId, fieldId, activityType, title, description, observations,
            gpsLatitude, gpsLongitude, photoUrls, createdAt, updatedAt
          ) VALUES (
            ${logId}, ${ctx.user.id}, ${input.farmId}, ${input.fieldId ?? null}, 
            ${input.activityType}, ${input.title}, ${input.description ?? null}, 
            ${input.observations ?? null}, ${input.gpsLatitude ?? null}, 
            ${input.gpsLongitude ?? null}, ${photoUrlsJson}, ${now}, ${now}
          )`
        );

        broadcastToFarm(input.farmId, {
          type: 'activity_created',
          data: {
            logId,
            farmId: input.farmId,
            fieldId: input.fieldId,
            activityType: input.activityType,
            title: input.title,
            description: input.description,
            observations: input.observations,
            gpsLatitude: input.gpsLatitude,
            gpsLongitude: input.gpsLongitude,
            photoUrls: input.photoUrls,
            createdAt: now.toISOString(),
          },
          timestamp: now.toISOString(),
        });

        return {
          success: true,
          logId,
          message: 'Activity logged successfully',
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to create activity log:', errorMessage);
        console.error('Full error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to log activity: ${errorMessage}`,
        });
      }
    }),

  updateActivityLog: protectedProcedure
    .input(z.object({
      logId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      observations: z.string().optional(),
      photoUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const now = new Date();
        const updates: string[] = ['updatedAt = NOW()'];

        if (input.title) updates.push(`title = '${input.title}'`);
        if (input.description) updates.push(`description = '${input.description}'`);
        if (input.observations) updates.push(`observations = '${input.observations}'`);
        if (input.photoUrls) updates.push(`photoUrls = '${JSON.stringify(input.photoUrls)}'`);

        await db.execute(
          sql`UPDATE fieldWorkerActivityLogs SET ${sql.raw(updates.join(', '))} WHERE logId = ${input.logId}`
        );

        return { success: true, message: 'Activity log updated' };
      } catch (error) {
        console.error('Failed to update activity log:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update activity log',
        });
      }
    }),

  deleteActivityLog: protectedProcedure
    .input(z.object({
      logId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        await db.execute(
          sql`DELETE FROM fieldWorkerActivityLogs WHERE logId = ${input.logId}`
        );

        return { success: true, message: 'Activity log deleted' };
      } catch (error) {
        console.error('Failed to delete activity log:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete activity log',
        });
      }
    }),

  getDashboardData: protectedProcedure
    .input(z.object({
      farmId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        // Get pending tasks
        const pendingTasks = await db
          .select()
          .from(fieldWorkerTasks)
          .where(eq(fieldWorkerTasks.farmId, input.farmId))
          .orderBy(desc(fieldWorkerTasks.dueDate))
          .limit(10);

        // Get recent activities
        const recentActivities = await db
          .select()
          .from(fieldWorkerActivityLogs)
          .where(eq(fieldWorkerActivityLogs.farmId, input.farmId))
          .orderBy(desc(fieldWorkerActivityLogs.createdAt))
          .limit(10);

        // Calculate work hours today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const workHoursResult = await db.execute(
          sql`SELECT 
                SUM(TIMESTAMPDIFF(MINUTE, clockInTime, clockOutTime)) as totalMinutes
              FROM timeTrackerLogs 
              WHERE userId = ${ctx.user.id} 
              AND farmId = ${input.farmId}
              AND clockInTime >= ${today}
              AND clockInTime < ${tomorrow}`
        );

        const workHoursArray = Array.isArray(workHoursResult) ? workHoursResult : [];
        const totalMinutes = (workHoursArray[0] ? (workHoursArray[0] as any).totalMinutes : null) || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return {
          pendingTasks: pendingTasks || [],
          recentActivities: recentActivities || [],
          workHoursToday: { hours, minutes },
        };
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch dashboard data',
        });
      }
    }),

  clockIn: protectedProcedure
    .input(z.object({
      farmId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const now = new Date();
        await db.execute(
          sql`INSERT INTO timeTrackerLogs (userId, farmId, clockInTime, createdAt, updatedAt)
              VALUES (${ctx.user.id}, ${input.farmId}, ${now}, ${now}, ${now})`
        );
        return { success: true, message: 'Clocked in successfully' };
      } catch (error) {
        console.error('Failed to clock in:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clock in',
        });
      }
    }),

  clockOut: protectedProcedure
    .input(z.object({
      farmId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const now = new Date();
        await db.execute(
          sql`UPDATE timeTrackerLogs 
              SET clockOutTime = ${now}, updatedAt = ${now}
              WHERE userId = ${ctx.user.id} 
              AND farmId = ${input.farmId}
              AND clockOutTime IS NULL
              ORDER BY clockInTime DESC
              LIMIT 1`
        );
        return { success: true, message: 'Clocked out successfully' };
      } catch (error) {
        console.error('Failed to clock out:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clock out',
        });
      }
    }),

  getTimeTrackerLogs: protectedProcedure
    .input(z.object({
      farmId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const query = db.execute(
          sql`SELECT 
                id,
                userId,
                farmId,
                clockInTime,
                clockOutTime,
                CASE 
                  WHEN clockOutTime IS NOT NULL 
                  THEN TIMESTAMPDIFF(MINUTE, clockInTime, clockOutTime)
                  ELSE TIMESTAMPDIFF(MINUTE, clockInTime, NOW())
                END as durationMinutes,
                createdAt,
                updatedAt
              FROM timeTrackerLogs
              WHERE farmId = ${input.farmId}
              AND userId = ${ctx.user.id}
              ${input.startDate ? sql`AND DATE(clockInTime) >= ${input.startDate}` : sql``}
              ${input.endDate ? sql`AND DATE(clockInTime) <= ${input.endDate}` : sql``}
              ORDER BY clockInTime DESC
              LIMIT 100`
        );
        return query;
      } catch (error) {
        console.error('Failed to fetch time tracker logs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch time tracker logs',
        });
      }
    }),

  createTask: protectedProcedure
    .input(z.object({
      farmId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      taskType: z.enum(['planting', 'monitoring', 'irrigation', 'fertilization', 'pest_control', 'weed_control', 'harvest', 'equipment_maintenance', 'soil_testing', 'other']),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      dueDate: z.string(), // ISO string
      assignedToUserId: z.number(),
      fieldId: z.number().optional(),
      estimatedDuration: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const taskId = uuidv4();
        const now = new Date();
        const dueDate = new Date(input.dueDate);

        await db.insert(fieldWorkerTasks).values({
          taskId,
          farmId: input.farmId,
          assignedToUserId: input.assignedToUserId,
          assignedByUserId: ctx.user.id,
          fieldId: input.fieldId ?? null,
          title: input.title,
          description: input.description ?? null,
          taskType: input.taskType,
          priority: input.priority,
          status: 'pending',
          dueDate,
          estimatedDuration: input.estimatedDuration ?? null,
          createdAt: now,
          updatedAt: now,
        });

        // Broadcast to farm via WebSocket
        broadcastToFarm(input.farmId, {
          type: 'task_created',
          data: { taskId, title: input.title, assignedToUserId: input.assignedToUserId },
          timestamp: now.toISOString(),
        });

        // Send email notification to assigned worker
        try {
          const workerRows = await db.select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, input.assignedToUserId))
            .limit(1);
          if (workerRows.length > 0) {
            const worker = workerRows[0];
            const dueDateStr = new Date(input.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const assignerName = ctx.user.name || 'Your Manager';
            await emailNotifications['sendEmail'](
              worker.email,
              `New Task Assigned: ${input.title}`,
              `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#2D5016;color:white;padding:20px;text-align:center;"><h1>FarmKonnect Task Assignment</h1></div>
                <div style="padding:20px;background:#f9f9f9;">
                  <p>Hi ${worker.name},</p>
                  <p>You have been assigned a new task by <strong>${assignerName}</strong>.</p>
                  <div style="background:white;border-left:4px solid #2D5016;padding:15px;margin:20px 0;">
                    <h3 style="margin-top:0;color:#2D5016;">Task Details</h3>
                    <p><strong>Title:</strong> ${input.title}</p>
                    <p><strong>Type:</strong> ${input.taskType}</p>
                    <p><strong>Priority:</strong> ${input.priority.toUpperCase()}</p>
                    <p><strong>Due Date:</strong> ${dueDateStr}</p>
                    ${input.description ? `<p><strong>Description:</strong> ${input.description}</p>` : ''}
                  </div>
                  <p>Please log in to FarmKonnect to view and update your task status.</p>
                </div>
              </div>`,
              `Hi ${worker.name}, you have been assigned a new task: "${input.title}" (${input.priority} priority, due ${dueDateStr}). Assigned by ${assignerName}.`
            );
          }
        } catch (emailError) {
          console.warn('Failed to send task assignment email:', emailError);
        }

        return { success: true, taskId };
      } catch (error) {
        console.error('Failed to create task:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create task',
        });
      }
    }),

  deleteTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }
      try {
        await db.delete(fieldWorkerTasks).where(eq(fieldWorkerTasks.taskId, input.taskId));
        return { success: true };
      } catch (error) {
        console.error('Failed to delete task:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete task' });
      }
    }),

  // ─── Task Comments ───────────────────────────────────────────────────────────

  getTaskComments: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const comments = await db
        .select({
          commentId: taskComments.commentId,
          taskId: taskComments.taskId,
          content: taskComments.content,
          createdAt: taskComments.createdAt,
          authorName: users.name,
          authorEmail: users.email,
        })
        .from(taskComments)
        .leftJoin(users, eq(taskComments.authorUserId, users.id))
        .where(eq(taskComments.taskId, input.taskId))
        .orderBy(desc(taskComments.createdAt));
      return comments;
    }),

  addTaskComment: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const commentId = uuidv4();
      const now = new Date();
      await db.insert(taskComments).values({
        commentId,
        taskId: input.taskId,
        authorUserId: ctx.user.id,
        content: input.content,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, commentId };
    }),

  deleteTaskComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      await db.delete(taskComments).where(
        and(eq(taskComments.commentId, input.commentId), eq(taskComments.authorUserId, ctx.user.id))
      );
      return { success: true };
    }),

  // ─── Batch Status Update ─────────────────────────────────────────────────────

  batchUpdateTaskStatus: protectedProcedure
    .input(z.object({
      taskIds: z.array(z.string()).min(1).max(100),
      status: z.enum(['pending', 'in_progress', 'completed']),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const now = new Date();
      let updated = 0;
      for (const taskId of input.taskIds) {
        await db.update(fieldWorkerTasks)
          .set({ status: input.status, updatedAt: now })
          .where(eq(fieldWorkerTasks.taskId, taskId));
        updated++;
      }
      return { success: true, updated };
    }),
});
