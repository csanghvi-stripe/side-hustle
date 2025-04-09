import { Request, Response } from "express";
import { storage } from "../storage";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const AI_MODEL = "claude-3-7-sonnet-20250219";

// Authentication middleware
export const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
};

// Check if the user has a valid subscription or enough credits
export const hasCoachAccess = async (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    // Get the user from the database to get up-to-date subscription info
    const user = await storage.getUser(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user has an active subscription or credits
    if (
      (user.subscriptionStatus === "active" && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) ||
      (user.chatCredits && user.chatCredits > 0)
    ) {
      // Attach the user to the request for later use
      req.user = user;
      return next();
    }

    return res.status(403).json({ 
      message: "You need an active subscription or credits to use the AI coach"
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return res.status(500).json({ 
      message: "An error occurred checking your subscription",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Get subscription info
export const getSubscriptionInfo = async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      status: user.subscriptionStatus || "free",
      tier: user.subscriptionTier || "free",
      credits: user.chatCredits || 0,
      expiresAt: user.subscriptionExpiresAt || null
    });
  } catch (error) {
    console.error("Error fetching subscription info:", error);
    return res.status(500).json({
      message: "Failed to fetch subscription info",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Create a new conversation
export const createConversation = async (req: Request, res: Response) => {
  try {
    const { title = "New Conversation" } = req.body;

    const conversation = await storage.createChatConversation({
      userId: req.user!.id,
      title
    });

    // Add a system message to set the context
    await storage.createChatMessage({
      conversationId: conversation.id,
      role: "system",
      content: `You are a helpful AI career coach specializing in helping users identify and monetize their skills. 
Your primary goals are to:
1. Help users identify potential monetization opportunities based on their skills
2. Provide practical advice for starting a side hustle or business
3. Offer guidance on setting rates, finding clients, and marketing services
4. Support users in overcoming challenges and obstacles to success
5. Provide specific, actionable steps tailored to the user's unique situation

Focus on being practical, specific, and encouraging. Always ask follow-up questions to better understand the user's situation.
Keep responses concise but informative. The current date is ${new Date().toISOString().split('T')[0]}.`
    });

    // Add an assistant welcome message
    const welcomeMessage = await storage.createChatMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "Hello! I'm your AI Career Coach. I'm here to help you identify monetization opportunities and develop strategies for your side hustle. What skills are you looking to monetize, or what kind of help do you need today?",
      tokensUsed: 50,
      creditsCost: 0 // First message is free
    });

    return res.status(201).json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return res.status(500).json({
      message: "Failed to create conversation",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Get user's conversations
export const getConversations = async (req: Request, res: Response) => {
  try {
    const conversations = await storage.getUserChatConversations(req.user!.id);
    return res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({
      message: "Failed to fetch conversations",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Get messages for a conversation
export const getMessages = async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    
    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }
    
    // Check if the conversation belongs to the user
    const conversation = await storage.getChatConversation(conversationId);
    
    if (!conversation || conversation.userId !== req.user!.id) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const messages = await storage.getChatMessages(conversationId);
    
    // Filter out system messages
    const clientMessages = messages.filter(m => m.role !== "system");
    
    return res.status(200).json(clientMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({
      message: "Failed to fetch messages",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Send a message in a conversation
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const { content } = req.body;
    
    if (isNaN(conversationId) || !content) {
      return res.status(400).json({ message: "Invalid request" });
    }
    
    // Check if the conversation belongs to the user
    const conversation = await storage.getChatConversation(conversationId);
    
    if (!conversation || conversation.userId !== req.user!.id) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Check if the user has enough credits
    const user = await storage.getUser(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // If the user doesn't have an active subscription, check credits
    if (user.subscriptionStatus !== "active" && (!user.chatCredits || user.chatCredits <= 0)) {
      return res.status(403).json({ message: "You don't have enough credits" });
    }
    
    // Get all messages for the conversation to build the context
    const conversationMessages = await storage.getChatMessages(conversationId);
    
    // Save the user message first
    const userMessage = await storage.createChatMessage({
      conversationId,
      role: "user",
      content
    });
    
    // Update the conversation's title
    await storage.updateChatConversation(conversationId, {
      title: conversation.title // Keep the same title but trigger auto-update of timestamps
    });
    
    // If this is the first user message, update the conversation title based on content
    if (conversationMessages.filter(m => m.role === "user").length === 0) {
      let title = content.length > 50 ? content.substring(0, 50) + "..." : content;
      
      await storage.updateChatConversation(conversationId, {
        title
      });
    }
    
    // Format messages for Claude
    // Extract system message first
    const systemMessages = conversationMessages.filter(m => m.role === "system");
    const systemPrompt = systemMessages.length > 0 ? systemMessages[0].content : "";
    
    // Only include user and assistant messages
    const userAssistantMessages = conversationMessages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));
    
    // Add the latest user message
    userAssistantMessages.push({
      role: "user",
      content
    });
    
    // Call Claude API
    try {
      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: userAssistantMessages
      });
      
      // Calculate tokens
      const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 100;
      // Simple formula: 1 credit per 1000 tokens, minimum 1 credit
      const creditsCost = Math.max(1, Math.ceil(tokensUsed / 1000));
      
      // Get the response content
      let assistantContent = "";
      try {
        // Try to extract text content safely
        assistantContent = typeof response.content[0].text === 'string' 
          ? response.content[0].text 
          : JSON.stringify(response.content);
      } catch (err) {
        console.error("Error extracting content from Claude response:", err);
        assistantContent = "I apologize, but I'm having trouble generating a coherent response right now.";
      }
      
      // Save the assistant's response
      const assistantMessage = await storage.createChatMessage({
        conversationId,
        role: "assistant",
        content: assistantContent,
        tokensUsed,
        creditsCost
      });
      
      // Deduct credits if the user doesn't have an active subscription
      if (user.subscriptionStatus !== "active" && user.chatCredits) {
        const newCreditBalance = Math.max(0, user.chatCredits - creditsCost);
        
        await storage.updateUser(user.id, {
          chatCredits: newCreditBalance
        });
        
        // Record the transaction
        await storage.createCreditTransaction({
          userId: user.id,
          amount: -creditsCost,
          reason: "Chat message",
          messageId: assistantMessage.id,
          balanceAfter: newCreditBalance
        });
      }
      
      return res.status(201).json({
        userMessage,
        assistantMessage,
        creditsUsed: creditsCost,
        creditsRemaining: user.subscriptionStatus === "active" 
          ? "unlimited" 
          : Math.max(0, (user.chatCredits || 0) - creditsCost)
      });
    } catch (error) {
      console.error("Error calling Claude API:", error);
      
      // Save a fallback response
      await storage.createChatMessage({
        conversationId,
        role: "assistant",
        content: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment."
      });
      
      return res.status(500).json({
        message: "Failed to get AI response",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({
      message: "Failed to send message",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Archive a conversation
export const archiveConversation = async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    
    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }
    
    // Check if the conversation belongs to the user
    const conversation = await storage.getChatConversation(conversationId);
    
    if (!conversation || conversation.userId !== req.user!.id) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Here we need to trick the system since the schema doesn't have isArchived
    // We'll update the title to include "[Archived]" prefix 
    const title = (conversation.title || "Conversation").includes("[Archived]") 
      ? conversation.title 
      : `[Archived] ${conversation.title || "Conversation"}`;
      
    const updatedConversation = await storage.updateChatConversation(conversationId, {
      title
    });
    
    return res.status(200).json(updatedConversation);
  } catch (error) {
    console.error("Error archiving conversation:", error);
    return res.status(500).json({
      message: "Failed to archive conversation",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};