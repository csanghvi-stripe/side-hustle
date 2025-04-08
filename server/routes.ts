import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateMonetizationOpportunities } from "./api/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Discover monetization opportunities
  app.post("/api/opportunities/discover", async (req, res) => {
    try {
      const { skills, timeAvailability, riskAppetite, incomeGoals, workPreference, additionalDetails } = req.body;

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
      });

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

  const httpServer = createServer(app);

  return httpServer;
}
