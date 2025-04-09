import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateMonetizationOpportunities } from "./api/anthropic";
import { generateEnhancedMonetizationOpportunities } from "./api/enhanced-anthropic";
import { setupAuth } from "./auth";
import { insertUserProfileSchema, insertMonetizationOpportunitySchema } from "@shared/schema";
import * as analytics from "./api/analytics";
import * as coach from "./api/coach";
import * as progressAnalysis from "./api/progress-analysis";
import { z } from "zod";
import pkg from "pg";
const { Pool } = pkg;

// Create a Pool for direct DB operations
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Development endpoint to clear all sessions (only enable in development mode)
  app.post("/api/dev/clear-sessions", async (req, res) => {
    try {
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          message: "This endpoint is only available in development mode",
        });
      }
      
      // Direct query to truncate session table
      await dbPool.query('TRUNCATE TABLE "session" CASCADE');
      
      return res.status(200).json({
        message: "All sessions have been cleared successfully",
      });
    } catch (error) {
      console.error("Error clearing sessions:", error);
      return res.status(500).json({
        message: "Failed to clear sessions",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Discover monetization opportunities
  app.post("/api/opportunities/discover", async (req, res) => {
    try {
      const { skills, timeAvailability, riskAppetite, incomeGoals, workPreference, additionalDetails } = req.body;

      // Extract the social networking settings
      const { discoverable = true, allowMessages = true } = req.body;

      // Validate required fields
      if (!skills || !timeAvailability || !riskAppetite || !incomeGoals) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Set a flag to use enhanced or regular algorithm
      const useEnhanced = req.query.enhanced === 'true' || req.body.useEnhanced === true;
      
      // Log which algorithm is being used
      console.log(`Using ${useEnhanced ? 'enhanced' : 'regular'} monetization algorithm`);
      
      // Generate monetization opportunities using the appropriate algorithm
      const opportunities = await (useEnhanced ? 
        generateEnhancedMonetizationOpportunities({
          skills,
          timePerWeek: timeAvailability,
          incomeGoal: `$${incomeGoals}/month`,
          riskTolerance: riskAppetite,
          preference: workPreference,
          additionalDetails: additionalDetails || "",
          discoverable,
          allowMessages,
        }) : 
        generateMonetizationOpportunities({
          skills,
          timePerWeek: timeAvailability,
          incomeGoal: `$${incomeGoals}/month`,
          riskTolerance: riskAppetite,
          preference: workPreference,
          additionalDetails: additionalDetails || "",
          discoverable,
          allowMessages,
        })
      );

      // If user is authenticated, save their opportunity results
      if (req.isAuthenticated() && req.user?.id) {
        try {
          await storage.saveOpportunity({
            userId: req.user.id,
            opportunityData: opportunities,
            createdAt: new Date().toISOString(),
            shared: discoverable
          });
        } catch (err) {
          console.error("Error saving opportunity:", err);
          // Continue even if saving fails
        }
      }

      // Return the opportunities
      return res.status(200).json(opportunities);
    } catch (error) {
      console.error("Error generating opportunities:", error);
      return res.status(500).json({ 
        message: "Failed to generate monetization opportunities",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get user profile
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      return res.status(200).json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      return res.status(500).json({
        message: "Failed to fetch user profile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Create or update user profile
  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const profileSchema = insertUserProfileSchema.extend({
        skills: z.array(z.string()).or(z.string()).transform(val => 
          typeof val === 'string' ? [val] : val
        ),
      });
      
      const validatedData = profileSchema.parse({
        ...req.body,
        userId
      });
      
      // Check if profile exists
      const existingProfile = await storage.getUserProfile(userId);
      
      let profile;
      if (existingProfile) {
        // Update existing profile
        profile = await storage.updateUserProfile(userId, validatedData);
      } else {
        // Create new profile
        profile = await storage.createUserProfile(validatedData);
      }
      
      return res.status(200).json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({
        message: "Failed to update user profile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get user's saved monetization opportunities
  app.get("/api/opportunities", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const opportunities = await storage.getUserOpportunities(userId);
      
      return res.status(200).json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      return res.status(500).json({
        message: "Failed to fetch opportunities",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Save a monetization opportunity
  app.post("/api/opportunities", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const schema = z.object({
        opportunityData: z.any(),
        shared: z.boolean().default(false),
        createdAt: z.string().datetime().optional(),
        skills: z.array(z.string()).optional().default([]),
        title: z.string().optional()
      });
      
      const validatedData = schema.parse(req.body);
      
      const opportunity = await storage.saveOpportunity({
        userId,
        opportunityData: validatedData.opportunityData,
        shared: validatedData.shared,
        createdAt: validatedData.createdAt || new Date().toISOString(),
        skills: validatedData.skills,
        title: validatedData.title
      });
      
      return res.status(201).json(opportunity);
    } catch (error) {
      console.error("Error saving opportunity:", error);
      return res.status(500).json({
        message: "Failed to save opportunity",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get publicly shared opportunities
  app.get("/api/opportunities/shared", async (req, res) => {
    try {
      const opportunities = await storage.getSharedOpportunities();
      
      return res.status(200).json(opportunities);
    } catch (error) {
      console.error("Error fetching shared opportunities:", error);
      return res.status(500).json({
        message: "Failed to fetch shared opportunities",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Messaging endpoints
  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const { recipientId, subject, content } = req.body;
      
      if (!recipientId || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const message = await storage.sendMessage({
        senderId: req.user!.id,
        senderName: req.user!.username,
        recipientId,
        subject,
        content
      });
      
      return res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({
        message: "Failed to send message",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getUserMessages(req.user!.id);
      
      return res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({
        message: "Failed to fetch messages",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      await storage.markMessageAsRead(messageId);
      
      return res.sendStatus(204);
    } catch (error) {
      console.error("Error marking message as read:", error);
      return res.status(500).json({
        message: "Failed to mark message as read",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // User connection endpoints
  app.post("/api/connections", isAuthenticated, async (req, res) => {
    try {
      const { recipientId } = req.body;
      
      if (!recipientId) {
        return res.status(400).json({ message: "Missing recipient ID" });
      }
      
      const connection = await storage.createConnection({
        requesterId: req.user!.id,
        recipientId,
        status: "pending"
      });
      
      return res.status(201).json(connection);
    } catch (error) {
      console.error("Error creating connection:", error);
      return res.status(500).json({
        message: "Failed to create connection",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/connections", isAuthenticated, async (req, res) => {
    try {
      const connections = await storage.getUserConnections(req.user!.id);
      
      return res.status(200).json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      return res.status(500).json({
        message: "Failed to fetch connections",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/connections/:id/status", isAuthenticated, async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(connectionId) || !status) {
        return res.status(400).json({ message: "Invalid request" });
      }
      
      const connection = await storage.updateConnectionStatus(connectionId, status);
      
      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }
      
      return res.status(200).json(connection);
    } catch (error) {
      console.error("Error updating connection:", error);
      return res.status(500).json({
        message: "Failed to update connection",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // === Analytics Dashboard API Endpoints ===
  
  // Progress Tracking endpoints
  app.post("/api/analytics/progress", isAuthenticated, analytics.createProgressTracking);
  app.get("/api/analytics/progress", isAuthenticated, analytics.getUserProgressTrackings);
  app.get("/api/analytics/progress/:id", isAuthenticated, analytics.getProgressTrackingById);
  app.patch("/api/analytics/progress/:id", isAuthenticated, analytics.updateProgressTracking);
  app.delete("/api/analytics/progress/:id", isAuthenticated, analytics.deleteProgressTracking);
  
  // Milestone endpoints
  app.post("/api/analytics/progress/:progressId/milestones", isAuthenticated, analytics.createMilestone);
  app.get("/api/analytics/progress/:progressId/milestones", isAuthenticated, analytics.getMilestones);
  app.patch("/api/analytics/milestones/:id", isAuthenticated, analytics.updateMilestone);
  app.delete("/api/analytics/milestones/:id", isAuthenticated, analytics.deleteMilestone);
  
  // Income Entry endpoints
  app.post("/api/analytics/progress/:progressId/income", isAuthenticated, analytics.createIncomeEntry);
  app.get("/api/analytics/progress/:progressId/income", isAuthenticated, analytics.getIncomeEntries);
  app.get("/api/analytics/income", isAuthenticated, analytics.getUserIncomeEntries);
  app.patch("/api/analytics/income/:id", isAuthenticated, analytics.updateIncomeEntry);
  app.delete("/api/analytics/income/:id", isAuthenticated, analytics.deleteIncomeEntry);
  
  // Analytics metrics endpoints
  app.get("/api/analytics/time-to-first-dollar", isAuthenticated, analytics.getTimeToFirstDollar);
  app.get("/api/analytics/dashboard", isAuthenticated, analytics.getAllAnalytics);
  
  // Action Plan endpoints
  app.post("/api/analytics/action-plans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const actionPlanData = req.body;
      
      // In a real implementation, you would save this to the database
      // For now, just return success
      return res.status(201).json({
        id: new Date().getTime(),
        userId,
        createdAt: new Date().toISOString(),
        ...actionPlanData
      });
    } catch (error) {
      console.error("Error saving action plan:", error);
      return res.status(500).json({
        message: "Failed to save action plan",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get("/api/analytics/action-plans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // In a real implementation, you would fetch from the database
      // For now, return a sample action plan for demo purposes
      const sampleActionPlan = {
        id: 123456789,
        userId: userId,
        title: "Freelance Content Creation Action Plan",
        createdAt: new Date().toISOString(),
        phases: [
          {
            title: "Phase 1: Foundation",
            duration: "2 weeks",
            tasks: [
              {
                id: "task-1-1",
                title: "Research Content Creation Opportunities",
                description: "Identify top platforms and niches with high demand for content creators.",
                priority: "high",
                durationDays: 3,
                status: "completed",
                completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
                notes: "Found promising opportunities in tech tutorials and lifestyle content.",
                resourceLinks: [
                  { title: "Market Research Template", url: "#" },
                  { title: "Content Creator Pay Rates Guide", url: "#" }
                ]
              },
              {
                id: "task-1-2",
                title: "Define Your Content Niche",
                description: "Select a specific content area based on your skills and market demand.",
                priority: "high",
                durationDays: 2,
                status: "completed",
                completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
                dependsOn: ["task-1-1"]
              },
              {
                id: "task-1-3",
                title: "Create Sample Content Pieces",
                description: "Develop 2-3 high-quality samples that showcase your content creation abilities.",
                priority: "medium",
                durationDays: 5,
                status: "in-progress",
              },
              {
                id: "task-1-4",
                title: "Set Up Professional Profiles",
                description: "Create accounts on relevant platforms and optimize your profile.",
                priority: "medium",
                durationDays: 2,
                status: "pending"
              }
            ]
          },
          {
            title: "Phase 2: Launch Preparation",
            duration: "3 weeks",
            tasks: [
              {
                id: "task-2-1",
                title: "Develop Service Packages",
                description: "Create 2-3 different service tiers with clear deliverables and pricing.",
                priority: "high",
                durationDays: 4,
                status: "pending",
                dependsOn: ["task-1-2"]
              },
              {
                id: "task-2-2",
                title: "Create Client Onboarding Process",
                description: "Develop questionnaires, contracts, and workflow documents.",
                priority: "medium",
                durationDays: 3,
                status: "pending"
              },
              {
                id: "task-2-3",
                title: "Set Up Payment System",
                description: "Create accounts on payment platforms and set up invoicing templates.",
                priority: "high",
                durationDays: 2,
                status: "pending"
              },
              {
                id: "task-2-4",
                title: "Develop Marketing Strategy",
                description: "Create a plan to promote your content creation services.",
                priority: "medium",
                durationDays: 5,
                status: "pending",
                resourceLinks: [
                  { title: "Content Creator Marketing Guide", url: "#" },
                  { title: "Social Media Strategy Template", url: "#" }
                ]
              }
            ]
          },
          {
            title: "Phase 3: First Clients",
            duration: "4 weeks",
            tasks: [
              {
                id: "task-3-1",
                title: "Identify Potential Clients",
                description: "Research and list 20-30 potential clients who would benefit from your services.",
                priority: "high",
                durationDays: 3,
                status: "pending",
                dependsOn: ["task-2-1", "task-2-4"]
              },
              {
                id: "task-3-2",
                title: "Launch Outreach Campaign",
                description: "Contact potential clients with personalized pitches.",
                priority: "high",
                durationDays: 14,
                status: "pending",
                dependsOn: ["task-3-1"]
              },
              {
                id: "task-3-3",
                title: "Set Up Feedback System",
                description: "Create a process to collect and incorporate client feedback.",
                priority: "medium",
                durationDays: 2,
                status: "pending"
              },
              {
                id: "task-3-4",
                title: "Secure First Client",
                description: "Close your first deal and deliver exceptional content.",
                priority: "high",
                durationDays: 7,
                status: "pending",
                dependsOn: ["task-3-2"]
              }
            ]
          },
          {
            title: "Phase 4: Optimization & Growth",
            duration: "Ongoing",
            tasks: [
              {
                id: "task-4-1",
                title: "Track Key Metrics",
                description: "Implement systems to track performance and income.",
                priority: "medium",
                durationDays: 3,
                status: "pending"
              },
              {
                id: "task-4-2",
                title: "Refine Service Offerings",
                description: "Adjust your packages based on client feedback and market response.",
                priority: "medium",
                durationDays: 4,
                status: "pending",
                dependsOn: ["task-3-4"]
              },
              {
                id: "task-4-3",
                title: "Develop Referral System",
                description: "Create incentives for existing clients to refer new business.",
                priority: "medium",
                durationDays: 2,
                status: "pending",
                dependsOn: ["task-3-4"]
              },
              {
                id: "task-4-4",
                title: "Scale Your Operation",
                description: "Identify processes that can be automated or outsourced.",
                priority: "low",
                durationDays: 7,
                status: "pending",
                dependsOn: ["task-4-2"]
              }
            ]
          }
        ],
        userInputs: {
          skills: {
            primarySkill: "Content Creation",
            secondarySkills: ["Copywriting", "Social Media Management"],
            confidenceRating: 4,
            experience: "I've been creating content for my personal blog for 2 years.",
            timeAvailablePerWeek: 15
          },
          goals: {
            targetMonthlyIncome: 2000,
            timeline: 3,
            riskTolerance: 3,
            workStyle: "client"
          },
          resources: {
            existingTools: "Adobe Creative Suite, Canva Pro",
            initialBudget: 200,
            existingAudience: "Small following on Instagram (~500) and Twitter (~300)",
            strengths: "Creativity, reliability, quick learner",
            weaknesses: "Sometimes perfectionist, need to improve networking"
          }
        }
      };
      
      return res.status(200).json([sampleActionPlan]);
    } catch (error) {
      console.error("Error fetching action plans:", error);
      return res.status(500).json({
        message: "Failed to fetch action plans",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // AI-powered Progress Tracking and Motivation System endpoints
  app.get("/api/analytics/action-plans/:actionPlanId/progress", isAuthenticated, progressAnalysis.getProgressAnalysis);
  app.patch("/api/analytics/action-plans/:actionPlanId/tasks/:taskId", isAuthenticated, progressAnalysis.updateTaskStatus);
  app.get("/api/analytics/action-plans/:actionPlanId/predictions", isAuthenticated, progressAnalysis.getTaskPredictions);
  app.get("/api/analytics/motivation", isAuthenticated, progressAnalysis.getMotivationalMessage);
  
  // === AI Coach API Endpoints ===
  
  // Subscription info
  app.get("/api/coach/subscription-info", isAuthenticated, coach.getSubscriptionInfo);
  
  // Promotion code endpoints
  app.post("/api/coach/apply-promo", isAuthenticated, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ success: false, message: "Promotion code is required" });
      }
      
      const result = await storage.validateAndApplyPromoCode(code, req.user!.id);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error applying promotion code:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to apply promotion code",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Admin-only endpoint to create or list promotion codes
  app.post("/api/admin/promo-codes", isAuthenticated, async (req, res) => {
    try {
      // Simple admin check - in a real app, use proper role-based access control
      if (req.user!.id !== 1) { // Assuming user ID 1 is admin
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { code, creditsAmount, expiryDate, maxUses } = req.body;
      
      if (!code || !creditsAmount) {
        return res.status(400).json({ message: "Code and credits amount are required" });
      }
      
      const promoCode = await storage.createPromotionCode({
        code,
        creditsAmount,
        expiryDate,
        maxUses,
        isActive: true
      });
      
      return res.status(201).json(promoCode);
    } catch (error) {
      console.error("Error creating promotion code:", error);
      return res.status(500).json({ 
        message: "Failed to create promotion code",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get("/api/admin/promo-codes", isAuthenticated, async (req, res) => {
    try {
      // Simple admin check
      if (req.user!.id !== 1) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const promoCodes = await storage.listPromotionCodes();
      return res.status(200).json(promoCodes);
    } catch (error) {
      console.error("Error listing promotion codes:", error);
      return res.status(500).json({ 
        message: "Failed to list promotion codes",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Conversation management
  app.post("/api/coach/conversations", isAuthenticated, coach.hasCoachAccess, coach.createConversation);
  app.get("/api/coach/conversations", isAuthenticated, coach.hasCoachAccess, coach.getConversations);
  app.patch("/api/coach/conversations/:conversationId/archive", isAuthenticated, coach.hasCoachAccess, coach.archiveConversation);
  
  // Message management
  app.get("/api/coach/conversations/:conversationId/messages", isAuthenticated, coach.hasCoachAccess, coach.getMessages);
  app.post("/api/coach/conversations/:conversationId/messages", isAuthenticated, coach.hasCoachAccess, coach.sendMessage);

  const httpServer = createServer(app);

  return httpServer;
}
