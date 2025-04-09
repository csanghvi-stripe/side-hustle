/**
 * Discovery Service
 * High-level service for interacting with the discovery engine
 */

import { v4 as uuidv4 } from "uuid";
import { MonetizationDiscoveryEngine } from "./engine";
import { UserDiscoveryInput, DiscoveryResults } from "./types";
import { logger } from "./utils";
import { 
  UpworkSource, 
  GumroadSource, 
  SubstackSource 
} from "./sources";
import { storage } from "../storage";
import { UserProfile } from "@shared/schema";

/**
 * DiscoveryService class
 * Provides high-level methods for discovery operations
 */
export class DiscoveryService {
  private engine: MonetizationDiscoveryEngine;
  private resultCache: Map<string, DiscoveryResults>;
  
  constructor() {
    this.engine = new MonetizationDiscoveryEngine();
    this.resultCache = new Map<string, DiscoveryResults>();
    
    // Register sources
    this.registerSources();
    
    // Set up cache cleanup
    this.setupCacheCleanup();
  }
  
  /**
   * Register all opportunity sources
   */
  private registerSources(): void {
    // Register freelance platforms
    this.engine.registerSource(new UpworkSource(process.env.UPWORK_API_KEY));
    
    // Register digital product platforms
    this.engine.registerSource(new GumroadSource(process.env.GUMROAD_API_KEY));
    
    // Register content creation platforms
    this.engine.registerSource(new SubstackSource());
    
    // Add more sources as needed
    // this.engine.registerSource(new FiverrSource());
    // this.engine.registerSource(new MavenSource());
    // etc.
    
    logger.info(`Registered ${this.engine.getSources().length} opportunity sources`);
  }
  
  /**
   * Discover monetization opportunities for a user
   */
  async discoverOpportunities(userId: number, formInput: any): Promise<DiscoveryResults> {
    try {
      logger.info(`Starting discovery for user ${userId}`);
      
      // Get user profile
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile) {
        throw new Error('User profile not found');
      }
      
      // Prepare input for the discovery engine
      const input: UserDiscoveryInput = this.prepareDiscoveryInput(userId, userProfile, formInput);
      
      // Run discovery
      const results = await this.engine.discoverOpportunities(input);
      
      // Cache results
      this.resultCache.set(results.requestId, results);
      
      // Save opportunities to database (if needed)
      await this.saveOpportunities(userId, results);
      
      return results;
    } catch (error) {
      logger.error(`Error in discovery service: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get previously discovered opportunities for a user
   */
  async getUserOpportunities(userId: number): Promise<any[]> {
    try {
      return await storage.getUserOpportunities(userId);
    } catch (error) {
      logger.error(`Error getting user opportunities: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get cached discovery results by ID
   */
  getCachedResults(requestId: string): DiscoveryResults | undefined {
    return this.resultCache.get(requestId);
  }
  
  /**
   * Prepare input for the discovery engine
   */
  private prepareDiscoveryInput(
    userId: number, 
    profile: UserProfile, 
    formInput: any
  ): UserDiscoveryInput {
    return {
      userId,
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      timeAvailability: formInput.timeAvailability || profile.timeAvailability || '10 hours/week',
      incomeGoals: Number(formInput.incomeGoals) || 3000,
      riskTolerance: formInput.riskAppetite || 'medium',
      workPreference: formInput.workPreference || 'remote',
      additionalDetails: formInput.additionalDetails,
      discoverable: profile.discoverable,
      allowMessages: profile.allowMessages,
      useEnhanced: !!formInput.useEnhanced
    };
  }
  
  /**
   * Save opportunities to the database
   */
  private async saveOpportunities(userId: number, results: DiscoveryResults): Promise<void> {
    try {
      // Save top opportunities for the user
      const topOpportunities = results.opportunities.slice(0, 10);
      
      for (const opportunity of topOpportunities) {
        await storage.saveOpportunity({
          userId,
          title: opportunity.title,
          type: opportunity.type,
          description: opportunity.description,
          incomePotential: `$${opportunity.estimatedIncome.min}-${opportunity.estimatedIncome.max} ${opportunity.estimatedIncome.timeframe}`,
          startupCost: `$${opportunity.startupCost.min}-${opportunity.startupCost.max}`,
          riskLevel: opportunity.entryBarrier,
          stepsToStart: JSON.stringify(opportunity.stepsToStart),
          resources: JSON.stringify(opportunity.resources),
          matchScore: opportunity.matchScore,
          category: opportunity.categories.primary,
          timeToFirstDollar: opportunity.timeToFirstDollar,
          skillsRequired: JSON.stringify(opportunity.skillsRequired),
          shared: false
        });
      }
      
      logger.info(`Saved ${topOpportunities.length} opportunities for user ${userId}`);
    } catch (error) {
      logger.error(`Error saving opportunities: ${error.message}`);
      // Continue without saving - this shouldn't break the discovery process
    }
  }
  
  /**
   * Set up cache cleanup to avoid memory leaks
   */
  private setupCacheCleanup(): void {
    // Clear cache daily
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, result] of this.resultCache.entries()) {
        // Remove results older than 24 hours
        if (now - result.timestamp.getTime() > 24 * 60 * 60 * 1000) {
          this.resultCache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} cached discovery results`);
      }
    }, 3600000); // Run every hour
  }
}

// Export a singleton instance
export const discoveryService = new DiscoveryService();