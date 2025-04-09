import { Request, Response } from "express";
import { storage } from "../storage";
import { 
  insertProgressTrackingSchema, 
  insertProgressMilestoneSchema, 
  insertIncomeEntrySchema 
} from "@shared/schema";
import { z } from "zod";

// Middleware to ensure the request is authenticated
export const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

// Handler to create a new progress tracking
export async function createProgressTracking(req: Request, res: Response) {
  try {
    // Parse and validate the request body
    const data = insertProgressTrackingSchema.parse({
      ...req.body,
      userId: req.user!.id, // Set the user ID from the authenticated user
    });

    // Create the progress tracking in the database
    const progressTracking = await storage.createProgressTracking(data);
    res.status(201).json(progressTracking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error("Error creating progress tracking:", error);
      res.status(500).json({ message: "Failed to create progress tracking" });
    }
  }
}

// Handler to get all progress tracking for the authenticated user
export async function getUserProgressTrackings(req: Request, res: Response) {
  try {
    const progressTrackings = await storage.getUserProgressTrackings(req.user!.id);
    res.status(200).json(progressTrackings);
  } catch (error) {
    console.error("Error fetching progress trackings:", error);
    res.status(500).json({ message: "Failed to fetch progress trackings" });
  }
}

// Handler to get a specific progress tracking by ID
export async function getProgressTrackingById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const progressTracking = await storage.getProgressTrackingById(id);
    if (!progressTracking) {
      return res.status(404).json({ message: "Progress tracking not found" });
    }

    // Ensure the user can only access their own progress tracking
    if (progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.status(200).json(progressTracking);
  } catch (error) {
    console.error("Error fetching progress tracking:", error);
    res.status(500).json({ message: "Failed to fetch progress tracking" });
  }
}

// Handler to update a progress tracking
export async function updateProgressTracking(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    // First, check if the progress tracking exists and belongs to the user
    const existing = await storage.getProgressTrackingById(id);
    if (!existing) {
      return res.status(404).json({ message: "Progress tracking not found" });
    }

    if (existing.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Parse and validate the update data
    const updateSchema = insertProgressTrackingSchema.partial();
    const data = updateSchema.parse(req.body);

    // Update the progress tracking
    const updated = await storage.updateProgressTracking(id, data);
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error("Error updating progress tracking:", error);
      res.status(500).json({ message: "Failed to update progress tracking" });
    }
  }
}

// Handler to delete a progress tracking
export async function deleteProgressTracking(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    // First, check if the progress tracking exists and belongs to the user
    const existing = await storage.getProgressTrackingById(id);
    if (!existing) {
      return res.status(404).json({ message: "Progress tracking not found" });
    }

    if (existing.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the progress tracking
    await storage.deleteProgressTracking(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting progress tracking:", error);
    res.status(500).json({ message: "Failed to delete progress tracking" });
  }
}

// MILESTONES

// Handler to create a new milestone
export async function createMilestone(req: Request, res: Response) {
  try {
    // Get the progress ID from the request
    const progressId = parseInt(req.params.progressId);
    if (isNaN(progressId)) {
      return res.status(400).json({ message: "Invalid progress ID" });
    }

    // Check if the progress tracking exists and belongs to the user
    const progressTracking = await storage.getProgressTrackingById(progressId);
    if (!progressTracking) {
      return res.status(404).json({ message: "Progress tracking not found" });
    }

    if (progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Parse and validate the request body
    const data = insertProgressMilestoneSchema.parse({
      ...req.body,
      progressId,
    });

    // Create the milestone
    const milestone = await storage.createProgressMilestone(data);
    res.status(201).json(milestone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error("Error creating milestone:", error);
      res.status(500).json({ message: "Failed to create milestone" });
    }
  }
}

// Handler to get all milestones for a progress tracking
export async function getMilestones(req: Request, res: Response) {
  try {
    const progressId = parseInt(req.params.progressId);
    if (isNaN(progressId)) {
      return res.status(400).json({ message: "Invalid progress ID" });
    }

    // Check if the progress tracking exists and belongs to the user
    const progressTracking = await storage.getProgressTrackingById(progressId);
    if (!progressTracking) {
      return res.status(404).json({ message: "Progress tracking not found" });
    }

    if (progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const milestones = await storage.getProgressMilestones(progressId);
    res.status(200).json(milestones);
  } catch (error) {
    console.error("Error fetching milestones:", error);
    res.status(500).json({ message: "Failed to fetch milestones" });
  }
}

// Handler to update a milestone
export async function updateMilestone(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    // Get the milestone to check ownership
    const milestone = await storage.getProgressMilestones(id);
    if (!milestone || milestone.length === 0) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    // Get the progress tracking to check user ownership
    const progressTracking = await storage.getProgressTrackingById(milestone[0].progressId);
    if (!progressTracking || progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Parse and validate the update data
    const updateSchema = insertProgressMilestoneSchema.partial();
    const data = updateSchema.parse(req.body);

    // Update the milestone
    const updated = await storage.updateProgressMilestone(id, data);
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error("Error updating milestone:", error);
      res.status(500).json({ message: "Failed to update milestone" });
    }
  }
}

// Handler to delete a milestone
export async function deleteMilestone(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    // Get the milestone to check ownership
    const milestone = await storage.getProgressMilestones(id);
    if (!milestone || milestone.length === 0) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    // Get the progress tracking to check user ownership
    const progressTracking = await storage.getProgressTrackingById(milestone[0].progressId);
    if (!progressTracking || progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the milestone
    await storage.deleteProgressMilestone(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting milestone:", error);
    res.status(500).json({ message: "Failed to delete milestone" });
  }
}

// INCOME ENTRIES

// Handler to create a new income entry
export async function createIncomeEntry(req: Request, res: Response) {
  try {
    // Get the progress ID from the request
    const progressId = parseInt(req.params.progressId);
    if (isNaN(progressId)) {
      return res.status(400).json({ message: "Invalid progress ID" });
    }

    // Check if the progress tracking exists and belongs to the user
    const progressTracking = await storage.getProgressTrackingById(progressId);
    if (!progressTracking) {
      return res.status(404).json({ message: "Progress tracking not found" });
    }

    if (progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Parse and validate the request body
    const data = insertIncomeEntrySchema.parse({
      ...req.body,
      progressId,
    });

    // Create the income entry
    const entry = await storage.createIncomeEntry(data);
    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error("Error creating income entry:", error);
      res.status(500).json({ message: "Failed to create income entry" });
    }
  }
}

// Handler to get all income entries for a progress tracking
export async function getIncomeEntries(req: Request, res: Response) {
  try {
    const progressId = parseInt(req.params.progressId);
    if (isNaN(progressId)) {
      return res.status(400).json({ message: "Invalid progress ID" });
    }

    // Check if the progress tracking exists and belongs to the user
    const progressTracking = await storage.getProgressTrackingById(progressId);
    if (!progressTracking) {
      return res.status(404).json({ message: "Progress tracking not found" });
    }

    if (progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const entries = await storage.getIncomeEntries(progressId);
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching income entries:", error);
    res.status(500).json({ message: "Failed to fetch income entries" });
  }
}

// Handler to get all income entries for a user (across all progress trackings)
export async function getUserIncomeEntries(req: Request, res: Response) {
  try {
    const entries = await storage.getIncomeEntriesByUser(req.user!.id);
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching user income entries:", error);
    res.status(500).json({ message: "Failed to fetch income entries" });
  }
}

// Handler to update an income entry
export async function updateIncomeEntry(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    // Get the income entry to check ownership
    const entries = await storage.getIncomeEntries(id);
    if (!entries || entries.length === 0) {
      return res.status(404).json({ message: "Income entry not found" });
    }

    // Get the progress tracking to check user ownership
    const progressTracking = await storage.getProgressTrackingById(entries[0].progressId);
    if (!progressTracking || progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Parse and validate the update data
    const updateSchema = insertIncomeEntrySchema.partial();
    const data = updateSchema.parse(req.body);

    // Update the income entry
    const updated = await storage.updateIncomeEntry(id, data);
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error("Error updating income entry:", error);
      res.status(500).json({ message: "Failed to update income entry" });
    }
  }
}

// Handler to delete an income entry
export async function deleteIncomeEntry(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    // Get the income entry to check ownership
    const entries = await storage.getIncomeEntries(id);
    if (!entries || entries.length === 0) {
      return res.status(404).json({ message: "Income entry not found" });
    }

    // Get the progress tracking to check user ownership
    const progressTracking = await storage.getProgressTrackingById(entries[0].progressId);
    if (!progressTracking || progressTracking.userId !== req.user!.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the income entry
    await storage.deleteIncomeEntry(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting income entry:", error);
    res.status(500).json({ message: "Failed to delete income entry" });
  }
}

// ANALYTICS

// Handler to get time to first dollar analytics
export async function getTimeToFirstDollar(req: Request, res: Response) {
  try {
    const analytics = await storage.getTimeToFirstDollar(req.user!.id);
    res.status(200).json(analytics);
  } catch (error) {
    console.error("Error fetching time to first dollar analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
}

// Handler to get all analytics data
export async function getAllAnalytics(req: Request, res: Response) {
  try {
    // Get all progress tracking data
    const progressTrackings = await storage.getUserProgressTrackings(req.user!.id);
    
    // Get time to first dollar analytics
    const timeToFirstDollar = await storage.getTimeToFirstDollar(req.user!.id);
    
    // Get all income data
    const incomeEntries = await storage.getIncomeEntriesByUser(req.user!.id);
    
    // Calculate total revenue
    const totalRevenue = incomeEntries.reduce((sum, entry) => {
      return sum + parseFloat(entry.amount.toString());
    }, 0);
    
    // Calculate average time to first dollar (in days)
    const avgTimeToFirstDollar = timeToFirstDollar.length > 0
      ? timeToFirstDollar.reduce((sum, item) => sum + item.days, 0) / timeToFirstDollar.length
      : null;
    
    // Count opportunities by type
    const opportunitiesByType: Record<string, number> = {};
    progressTrackings.forEach(track => {
      const type = track.opportunityType;
      opportunitiesByType[type] = (opportunitiesByType[type] || 0) + 1;
    });
    
    // Count opportunities with revenue
    const opportunitiesWithRevenue = progressTrackings.filter(track => track.firstRevenueDate).length;
    
    // Calculate success rate
    const successRate = progressTrackings.length > 0
      ? (opportunitiesWithRevenue / progressTrackings.length) * 100
      : 0;
    
    // Return the aggregated analytics
    res.status(200).json({
      totalRevenue,
      avgTimeToFirstDollar,
      opportunitiesByType,
      opportunitiesWithRevenue,
      totalOpportunities: progressTrackings.length,
      successRate,
      timeToFirstDollar,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
}