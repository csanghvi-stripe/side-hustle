import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

// Helper function to get personalized AI recommendations based on user progress
async function getAIRecommendations(userId: number, actionPlanId: string | number) {
  try {
    // In a real implementation, this would connect to an AI service like OpenAI
    // For now, we'll generate some intelligent-sounding recommendations
    
    // Get tasks completed by user (for this action plan or all plans)
    // const completedTasks = await storage.getCompletedTasksByUser(userId, actionPlanId);
    // const actionPlan = await storage.getActionPlan(actionPlanId);
    
    // For demo purposes, generate some recommendations
    return {
      nextSteps: [
        "Focus on completing tasks in sequential order to build momentum",
        "Consider spending more time on market research to validate your assumptions",
        "Based on your progress, aim to complete 2-3 tasks per week for optimal progress"
      ],
      insights: [
        "You're making good progress on foundation tasks, showing strong planning skills",
        "Your task completion pattern suggests you work best in the evenings",
        "Users with similar profiles typically struggle with the marketing tasks - set aside extra time for these"
      ],
      adaptive: true
    };
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    return {
      nextSteps: [
        "Complete tasks in sequential order",
        "Review your progress regularly",
        "Set realistic deadlines for each task"
      ],
      insights: [],
      adaptive: false
    };
  }
}

// Get progress analysis for a specific action plan
export async function getProgressAnalysis(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const actionPlanId = req.params.actionPlanId;
    
    // Validate actionPlanId
    if (!actionPlanId) {
      return res.status(400).json({ message: "Action plan ID is required" });
    }
    
    // Get action plan (would normally fetch from database)
    // const actionPlan = await storage.getActionPlan(actionPlanId);
    
    // In a real implementation, get the actual progress data
    // For now, generate some sample data
    
    // Get AI recommendations
    const recommendations = await getAIRecommendations(userId, actionPlanId);
    
    // Calculate streaks (in a real implementation, this would use actual timestamps)
    const today = new Date();
    const streakDays = Math.floor(Math.random() * 10) + 1; // Just for demo
    
    // Get the last 7 days of activity for charting
    const dailyProgress = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        tasksCompleted: Math.floor(Math.random() * 3), // 0-2 tasks per day
        minutesSpent: Math.floor(Math.random() * 60) + 15 // 15-75 minutes per day
      };
    }).reverse();
    
    // Get completion prediction (very simple calculation)
    const completionPrediction = {
      estimatedDate: new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString(), // ~30 days from now
      confidenceLevel: 0.8,
      factorsAffecting: [
        "Current completion rate",
        "Task complexity",
        "Available time per week"
      ]
    };
    
    return res.status(200).json({
      actionPlanId,
      userId,
      analysisDate: today.toISOString(),
      streakDays,
      dailyProgress,
      recommendations,
      completionPrediction,
      motivationalLevel: "high",
    });
    
  } catch (error) {
    console.error("Error generating progress analysis:", error);
    return res.status(500).json({
      message: "Failed to generate progress analysis",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Update task status (complete, in-progress, etc.)
export async function updateTaskStatus(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const actionPlanId = req.params.actionPlanId;
    const taskId = req.params.taskId;
    
    // Validate parameters
    if (!actionPlanId || !taskId) {
      return res.status(400).json({ message: "Action plan ID and task ID are required" });
    }
    
    // Validate request body
    const updateSchema = z.object({
      status: z.enum(["pending", "in-progress", "completed"]),
      notes: z.string().optional(),
      completedAt: z.string().datetime().optional()
    });
    
    const validatedData = updateSchema.parse(req.body);
    
    // In a real implementation, update the task in the database
    // await storage.updateTaskStatus(userId, actionPlanId, taskId, validatedData);
    
    // If task is marked as completed, trigger AI analysis for personalized feedback
    if (validatedData.status === "completed") {
      // In a real implementation, this would trigger an asynchronous AI analysis
      // For now, just simulate the response
      
      // Generate personalized feedback for this specific task completion
      const feedback = {
        message: "Great job completing this task! You're making excellent progress on your action plan.",
        nextRecommendation: "Consider working on task X next to maintain momentum.",
        insightGenerated: true
      };
      
      return res.status(200).json({
        taskId,
        status: validatedData.status,
        notes: validatedData.notes,
        completedAt: validatedData.completedAt || new Date().toISOString(),
        feedback
      });
    }
    
    return res.status(200).json({
      taskId,
      status: validatedData.status,
      notes: validatedData.notes,
      updated: true
    });
    
  } catch (error) {
    console.error("Error updating task status:", error);
    return res.status(500).json({
      message: "Failed to update task status",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Get task completion predictions
export async function getTaskPredictions(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const actionPlanId = req.params.actionPlanId;
    
    // Validate actionPlanId
    if (!actionPlanId) {
      return res.status(400).json({ message: "Action plan ID is required" });
    }
    
    // In a real implementation, we would fetch the action plan and generate predictions
    // For now, return sample data
    const predictions = [
      {
        taskId: "task-1-2",
        predictedCompletionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        difficultyRating: 2, // 1-5 scale
        estimatedTimeRequired: 120, // minutes
        recommendedApproach: "Break this task into smaller steps for easier completion"
      },
      {
        taskId: "task-2-1",
        predictedCompletionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        difficultyRating: 4,
        estimatedTimeRequired: 240,
        recommendedApproach: "Research similar examples before starting to save time"
      }
    ];
    
    return res.status(200).json({
      actionPlanId,
      userId,
      predictions,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error generating task predictions:", error);
    return res.status(500).json({
      message: "Failed to generate task predictions",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Get personalized motivational message
export async function getMotivationalMessage(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    
    // In a real implementation, this would analyze the user's progress patterns
    // and generate a personalized motivational message
    
    const messages = [
      "You're making excellent progress! Keep up the great work.",
      "You've been consistent with your tasks - that's the key to success!",
      "Breaking through challenges is what separates success from failure. You're doing great!",
      "Every task you complete brings you closer to your goals. Keep pushing forward!",
      "You're demonstrating the persistence needed to succeed in your monetization journey."
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    return res.status(200).json({
      userId,
      message: randomMessage,
      type: "encouragement",
      personalized: true,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error generating motivational message:", error);
    return res.status(500).json({
      message: "Failed to generate motivational message",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}