import {
  users,
  userProfiles,
  monetizationOpportunities,
  messages,
  connections,
  progressTracking,
  progressMilestones,
  incomeEntries,
  chatConversations,
  chatMessages,
  creditTransactions,
  promotionCodes,
  type User,
  type InsertUser,
  type UserProfile,
  type InsertUserProfile,
  type MonetizationOpportunity,
  type InsertMonetizationOpportunity,
  type Message,
  type InsertMessage,
  type Connection,
  type InsertConnection,
  type ProgressTracking,
  type InsertProgressTracking,
  type ProgressMilestone,
  type InsertProgressMilestone,
  type IncomeEntry,
  type InsertIncomeEntry,
  type ChatConversation,
  type InsertChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type CreditTransaction,
  type InsertCreditTransaction,
  type PromotionCode,
  type InsertPromotionCode,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pkg from "pg";
const { Pool } = pkg;

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  // User profiles
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(
    userId: number,
    data: Partial<InsertUserProfile>,
  ): Promise<UserProfile | undefined>;

  // Monetization opportunities
  saveOpportunity(
    opportunity: InsertMonetizationOpportunity,
  ): Promise<MonetizationOpportunity>;
  getUserOpportunities(userId: number): Promise<MonetizationOpportunity[]>;
  getSharedOpportunities(): Promise<MonetizationOpportunity[]>;
  deleteOpportunity(id: number, userId: number): Promise<void>;

  // Messaging
  sendMessage(message: InsertMessage): Promise<Message>;
  getUserMessages(userId: number): Promise<Message[]>;
  markMessageAsRead(messageId: number): Promise<void>;

  // Connections
  createConnection(connection: InsertConnection): Promise<Connection>;
  getUserConnections(userId: number): Promise<Connection[]>;
  updateConnectionStatus(
    connectionId: number,
    status: string,
  ): Promise<Connection | undefined>;

  // Progress & Analytics Tracking
  // Progress Tracking
  createProgressTracking(tracking: InsertProgressTracking): Promise<ProgressTracking>;
  getUserProgressTrackings(userId: number): Promise<ProgressTracking[]>;
  getProgressTrackingById(id: number): Promise<ProgressTracking | undefined>;
  updateProgressTracking(id: number, data: Partial<InsertProgressTracking>): Promise<ProgressTracking | undefined>;
  deleteProgressTracking(id: number): Promise<void>;
  
  // Milestones
  createProgressMilestone(milestone: InsertProgressMilestone): Promise<ProgressMilestone>;
  getProgressMilestones(progressId: number): Promise<ProgressMilestone[]>;
  updateProgressMilestone(id: number, data: Partial<InsertProgressMilestone>): Promise<ProgressMilestone | undefined>;
  deleteProgressMilestone(id: number): Promise<void>;
  
  // Income Tracking
  createIncomeEntry(entry: InsertIncomeEntry): Promise<IncomeEntry>;
  getIncomeEntries(progressId: number): Promise<IncomeEntry[]>;
  getIncomeEntriesByUser(userId: number): Promise<IncomeEntry[]>;
  updateIncomeEntry(id: number, data: Partial<InsertIncomeEntry>): Promise<IncomeEntry | undefined>;
  deleteIncomeEntry(id: number): Promise<void>;
  
  // Time to First Dollar Analytics
  getTimeToFirstDollar(userId: number): Promise<{opportunityId: number, opportunityTitle: string, days: number}[]>;
  
  // AI Coach Management
  // Chat conversations
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  getChatConversation(id: number): Promise<ChatConversation | undefined>;
  getUserChatConversations(userId: number): Promise<ChatConversation[]>;
  updateChatConversation(id: number, data: Partial<InsertChatConversation>): Promise<ChatConversation | undefined>;
  
  // Chat messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(conversationId: number): Promise<ChatMessage[]>;
  
  // Credit transactions
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getUserCreditTransactions(userId: number): Promise<CreditTransaction[]>;
  
  // Promotion codes
  createPromotionCode(code: InsertPromotionCode): Promise<PromotionCode>;
  getPromotionCode(code: string): Promise<PromotionCode | undefined>;
  validateAndApplyPromoCode(code: string, userId: number): Promise<{success: boolean, message: string, credits?: number}>;
  listPromotionCodes(): Promise<PromotionCode[]>;
  updatePromotionCode(id: number, data: Partial<InsertPromotionCode>): Promise<PromotionCode | undefined>;
  
  // Session management
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Set up Postgres session store using standard pg
    const PostgresSessionStore = connectPg(session);
    
    // Create a new pool for session storage
    const poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    };
    
    const pgPool = new Pool(poolConfig);
    
    this.sessionStore = new PostgresSessionStore({
      pool: pgPool,
      createTableIfMissing: true,
    });
  }


  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(
    id: number,
    data: Partial<InsertUser>,
  ): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // User profiles
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const result = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const result = await db.insert(userProfiles).values(profile).returning();
    return result[0];
  }

  async updateUserProfile(
    userId: number,
    data: Partial<InsertUserProfile>,
  ): Promise<UserProfile | undefined> {
    // Find the profile first
    const profile = await this.getUserProfile(userId);
    if (!profile) return undefined;

    // Update the profile
    const result = await db
      .update(userProfiles)
      .set(data)
      .where(eq(userProfiles.id, profile.id))
      .returning();
    return result[0];
  }

  // Monetization opportunities
  async saveOpportunity(
    opportunity: InsertMonetizationOpportunity,
  ): Promise<MonetizationOpportunity> {
    const result = await db
      .insert(monetizationOpportunities)
      .values(opportunity)
      .returning();
    return result[0];
  }

  async getUserOpportunities(
    userId: number,
  ): Promise<MonetizationOpportunity[]> {
    return db
      .select()
      .from(monetizationOpportunities)
      .where(eq(monetizationOpportunities.userId, userId));
  }

  async getSharedOpportunities(): Promise<MonetizationOpportunity[]> {
    return db
      .select()
      .from(monetizationOpportunities)
      .where(eq(monetizationOpportunities.shared, true));
  }
  
  async deleteOpportunity(id: number, userId: number): Promise<void> {
    // Only allow deletion if the opportunity belongs to the user
    await db
      .delete(monetizationOpportunities)
      .where(
        and(
          eq(monetizationOpportunities.id, id),
          eq(monetizationOpportunities.userId, userId)
        )
      );
  }

  // Messaging
  async sendMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getUserMessages(userId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        or(eq(messages.recipientId, userId), eq(messages.senderId, userId)),
      );
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }

  // Connections
  async createConnection(connection: InsertConnection): Promise<Connection> {
    const result = await db.insert(connections).values(connection).returning();
    return result[0];
  }

  async getUserConnections(userId: number): Promise<Connection[]> {
    return db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.requesterId, userId),
          eq(connections.recipientId, userId),
        ),
      );
  }

  async updateConnectionStatus(
    connectionId: number,
    status: string,
  ): Promise<Connection | undefined> {
    const result = await db
      .update(connections)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, connectionId))
      .returning();
    return result[0];
  }

  // Progress Tracking Methods
  async createProgressTracking(tracking: InsertProgressTracking): Promise<ProgressTracking> {
    const result = await db
      .insert(progressTracking)
      .values(tracking)
      .returning();
    return result[0];
  }

  async getUserProgressTrackings(userId: number): Promise<ProgressTracking[]> {
    return db
      .select()
      .from(progressTracking)
      .where(eq(progressTracking.userId, userId));
  }

  async getProgressTrackingById(id: number): Promise<ProgressTracking | undefined> {
    const result = await db
      .select()
      .from(progressTracking)
      .where(eq(progressTracking.id, id));
    return result[0];
  }

  async updateProgressTracking(
    id: number,
    data: Partial<InsertProgressTracking>
  ): Promise<ProgressTracking | undefined> {
    // Add lastUpdated timestamp
    const updatedData = {
      ...data,
      lastUpdated: new Date(),
    };

    const result = await db
      .update(progressTracking)
      .set(updatedData)
      .where(eq(progressTracking.id, id))
      .returning();
    return result[0];
  }

  async deleteProgressTracking(id: number): Promise<void> {
    // First delete all related milestones and income entries
    await db
      .delete(progressMilestones)
      .where(eq(progressMilestones.progressId, id));
    
    await db
      .delete(incomeEntries)
      .where(eq(incomeEntries.progressId, id));
    
    // Then delete the progress tracking itself
    await db
      .delete(progressTracking)
      .where(eq(progressTracking.id, id));
  }

  // Milestone Methods
  async createProgressMilestone(milestone: InsertProgressMilestone): Promise<ProgressMilestone> {
    const result = await db
      .insert(progressMilestones)
      .values(milestone)
      .returning();
    return result[0];
  }

  async getProgressMilestones(progressId: number): Promise<ProgressMilestone[]> {
    return db
      .select()
      .from(progressMilestones)
      .where(eq(progressMilestones.progressId, progressId));
  }

  async updateProgressMilestone(
    id: number,
    data: Partial<InsertProgressMilestone>
  ): Promise<ProgressMilestone | undefined> {
    const result = await db
      .update(progressMilestones)
      .set(data)
      .where(eq(progressMilestones.id, id))
      .returning();
    return result[0];
  }

  async deleteProgressMilestone(id: number): Promise<void> {
    await db
      .delete(progressMilestones)
      .where(eq(progressMilestones.id, id));
  }

  // Income Entry Methods
  async createIncomeEntry(entry: InsertIncomeEntry): Promise<IncomeEntry> {
    const result = await db
      .insert(incomeEntries)
      .values(entry)
      .returning();
    
    // Update the total revenue in the related progress tracking
    const progressTrack = await this.getProgressTrackingById(entry.progressId);
    if (progressTrack) {
      // If this is the first revenue entry, update the firstRevenueDate and firstRevenueAmount
      if (!progressTrack.firstRevenueDate) {
        await this.updateProgressTracking(progressTrack.id, {
          firstRevenueDate: entry.entryDate,
          firstRevenueAmount: entry.amount,
          totalRevenue: entry.amount,
        });
      } else {
        // Just add to the total revenue
        const currentTotal = progressTrack.totalRevenue ? parseFloat(progressTrack.totalRevenue.toString()) : 0;
        const newTotal = currentTotal + parseFloat(entry.amount.toString());
        await this.updateProgressTracking(progressTrack.id, {
          totalRevenue: newTotal.toString(),
        });
      }
    }
    
    return result[0];
  }

  async getIncomeEntries(progressId: number): Promise<IncomeEntry[]> {
    return db
      .select()
      .from(incomeEntries)
      .where(eq(incomeEntries.progressId, progressId));
  }

  async getIncomeEntriesByUser(userId: number): Promise<IncomeEntry[]> {
    // Get all progress tracking ids for this user
    const userProgress = await this.getUserProgressTrackings(userId);
    const progressIds = userProgress.map(p => p.id);
    
    if (progressIds.length === 0) return [];
    
    // Get all income entries for these progress trackings
    if (progressIds.length === 1) {
      return db
        .select()
        .from(incomeEntries)
        .where(eq(incomeEntries.progressId, progressIds[0]));
    } else if (progressIds.length > 1) {
      // Create a SQL "IN" condition
      return db
        .select()
        .from(incomeEntries)
        .where(sql`${incomeEntries.progressId} IN (${progressIds.join(',')})`);
    } else {
      return [];
    }
  }

  async updateIncomeEntry(
    id: number,
    data: Partial<InsertIncomeEntry>
  ): Promise<IncomeEntry | undefined> {
    // Get the current entry to calculate revenue difference
    const currentEntry = await db
      .select()
      .from(incomeEntries)
      .where(eq(incomeEntries.id, id));
    
    const result = await db
      .update(incomeEntries)
      .set(data)
      .where(eq(incomeEntries.id, id))
      .returning();
    
    // Update the total revenue in the related progress tracking if amount changed
    if (data.amount && currentEntry[0]) {
      const progressTrack = await this.getProgressTrackingById(currentEntry[0].progressId);
      if (progressTrack) {
        const amountDiff = parseFloat(data.amount.toString()) - parseFloat(currentEntry[0].amount.toString());
        const currentTotal = progressTrack.totalRevenue ? parseFloat(progressTrack.totalRevenue.toString()) : 0;
        const newTotal = currentTotal + amountDiff;
        await this.updateProgressTracking(progressTrack.id, {
          totalRevenue: newTotal.toString(),
        });
      }
    }
    
    return result[0];
  }

  async deleteIncomeEntry(id: number): Promise<void> {
    // Get the entry first to update the total revenue
    const entry = await db
      .select()
      .from(incomeEntries)
      .where(eq(incomeEntries.id, id));
    
    if (entry[0]) {
      const progressTrack = await this.getProgressTrackingById(entry[0].progressId);
      if (progressTrack) {
        const currentTotal = progressTrack.totalRevenue ? parseFloat(progressTrack.totalRevenue.toString()) : 0;
        const newTotal = currentTotal - parseFloat(entry[0].amount.toString());
        await this.updateProgressTracking(progressTrack.id, {
          totalRevenue: Math.max(0, newTotal).toString(),
        });
      }
    }
    
    await db
      .delete(incomeEntries)
      .where(eq(incomeEntries.id, id));
  }

  // Analytics Methods
  async getTimeToFirstDollar(userId: number): Promise<{opportunityId: number, opportunityTitle: string, days: number}[]> {
    const userProgress = await this.getUserProgressTrackings(userId);
    
    return userProgress
      .filter(p => p.firstRevenueDate) // Only include those with first revenue
      .map(p => {
        const startDate = new Date(p.startDate);
        // Make sure firstRevenueDate is not null (it's guaranteed by the filter above)
        const firstRevenueDate = p.firstRevenueDate ? new Date(p.firstRevenueDate) : new Date();
        const daysDiff = Math.floor((firstRevenueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          opportunityId: p.opportunityId,
          opportunityTitle: p.opportunityTitle,
          days: daysDiff,
        };
      });
  }
  
  // AI Coach Methods - Chat Conversations
  async createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const result = await db
      .insert(chatConversations)
      .values(conversation)
      .returning();
    return result[0];
  }

  async getChatConversation(id: number): Promise<ChatConversation | undefined> {
    const result = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, id));
    return result[0];
  }

  async getUserChatConversations(userId: number): Promise<ChatConversation[]> {
    return db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(sql`${chatConversations.updatedAt} DESC`);
  }

  async updateChatConversation(
    id: number,
    data: Partial<InsertChatConversation>
  ): Promise<ChatConversation | undefined> {
    const result = await db
      .update(chatConversations)
      .set(data)
      .where(eq(chatConversations.id, id))
      .returning();
    return result[0];
  }

  // AI Coach Methods - Chat Messages
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return result[0];
  }

  async getChatMessages(conversationId: number): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(sql`${chatMessages.timestamp} ASC`);
  }

  // AI Coach Methods - Credit Transactions
  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const result = await db
      .insert(creditTransactions)
      .values(transaction)
      .returning();
    return result[0];
  }

  async getUserCreditTransactions(userId: number): Promise<CreditTransaction[]> {
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(sql`${creditTransactions.createdAt} DESC`);
  }
  
  // Promotion Code Methods
  async createPromotionCode(code: InsertPromotionCode): Promise<PromotionCode> {
    const result = await db
      .insert(promotionCodes)
      .values(code)
      .returning();
    return result[0];
  }
  
  async getPromotionCode(code: string): Promise<PromotionCode | undefined> {
    const result = await db
      .select()
      .from(promotionCodes)
      .where(eq(promotionCodes.code, code));
    return result[0];
  }
  
  async validateAndApplyPromoCode(code: string, userId: number): Promise<{success: boolean, message: string, credits?: number}> {
    // Get the promotion code
    const promoCode = await this.getPromotionCode(code);
    
    if (!promoCode) {
      return { success: false, message: "Invalid promotion code" };
    }
    
    // Check if the code is active
    if (!promoCode.isActive) {
      return { success: false, message: "This promotion code is no longer active" };
    }
    
    // Check if the code has expired
    if (promoCode.expiryDate && new Date(promoCode.expiryDate) < new Date()) {
      return { success: false, message: "This promotion code has expired" };
    }
    
    // Check if the code has reached its maximum uses
    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return { success: false, message: "This promotion code has reached its maximum number of uses" };
    }
    
    // Get the user
    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }
    
    // Apply the credits to the user's account
    const currentCredits = user.chatCredits || 0;
    const newCredits = currentCredits + promoCode.creditsAmount;
    
    // Update the user's credit balance
    await this.updateUser(userId, {
      chatCredits: newCredits,
      subscriptionStatus: "active", // Set to active since they now have credits
    });
    
    // Increment the promo code usage
    await db
      .update(promotionCodes)
      .set({
        currentUses: (promoCode.currentUses || 0) + 1,
      })
      .where(eq(promotionCodes.id, promoCode.id));
    
    // Record this transaction
    await this.createCreditTransaction({
      userId,
      amount: promoCode.creditsAmount,
      reason: `Promo code: ${code}`,
      balanceAfter: newCredits,
    });
    
    return { 
      success: true, 
      message: `Successfully applied promotion code. ${promoCode.creditsAmount} credits added to your account.`,
      credits: promoCode.creditsAmount
    };
  }
  
  async listPromotionCodes(): Promise<PromotionCode[]> {
    return db
      .select()
      .from(promotionCodes)
      .orderBy(sql`${promotionCodes.createdAt} DESC`);
  }
  
  async updatePromotionCode(id: number, data: Partial<InsertPromotionCode>): Promise<PromotionCode | undefined> {
    const result = await db
      .update(promotionCodes)
      .set(data)
      .where(eq(promotionCodes.id, id))
      .returning();
    return result[0];
  }
}

// Export an instance of the DatabaseStorage
export const storage = new DatabaseStorage();
