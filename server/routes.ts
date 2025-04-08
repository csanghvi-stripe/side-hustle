import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateMonetizationOpportunities } from "./api/openai";
import { setupAuth } from "./auth";
import { insertUserProfileSchema } from "@shared/schema";
import { z } from "zod";

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

      // Generate monetization opportunities using OpenAI
      const opportunities = await generateMonetizationOpportunities({
        skills,
        timePerWeek: timeAvailability,
        incomeGoal: `$${incomeGoals}/month`,
        riskTolerance: riskAppetite,
        preference: workPreference,
        additionalDetails: additionalDetails || "",
        discoverable,
        allowMessages,
      });

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

  const httpServer = createServer(app);

  return httpServer;
}
