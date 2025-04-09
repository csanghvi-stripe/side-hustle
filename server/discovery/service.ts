/**
 * Discovery Service
 * 
 * This service acts as the facade to the discovery engine, managing the registration
 * and coordination of various opportunity sources.
 */

import { DiscoveryPreferences, DiscoveryResults, OpportunitySource, RawOpportunity, SimilarUser } from './types';
import { db } from '../db';
import { logger } from './utils';
import { monetizationOpportunities, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Source Manager
class DiscoveryService {
  private sources: Map<string, OpportunitySource> = new Map();
  private sourceTimeout = 30000; // 30 seconds timeout for sources
  private resultCache: Map<string, DiscoveryResults> = new Map();
  private cacheExpirationMs = 30 * 60 * 1000; // 30 minutes cache expiration
  
  /**
   * Register a new opportunity source with the engine
   */
  public registerSource(source: OpportunitySource): void {
    if (this.sources.has(source.id)) {
      logger.warn(`Source with ID ${source.id} is already registered. Replacing.`);
    }
    
    this.sources.set(source.id, source);
    logger.info(`Registered source: ${source.name} (${source.id})`);
  }
  
  /**
   * Get a registered source by ID
   */
  public getSource(id: string): OpportunitySource | undefined {
    return this.sources.get(id);
  }
  
  /**
   * Get all registered sources
   */
  public getAllSources(): OpportunitySource[] {
    return Array.from(this.sources.values());
  }
  
  /**
   * Main method to discover personalized opportunities for a user
   */
  public async discoverOpportunities(
    userId: number,
    preferences: DiscoveryPreferences
  ): Promise<DiscoveryResults> {
    logger.info(`Starting discovery for user ${userId}`);
    
    try {
      // Get user profile data
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Get any previously saved opportunities to avoid duplicates
      const previousOpportunities = await db.query.monetizationOpportunities.findMany({
        where: eq(monetizationOpportunities.userId, userId)
      });
      
      // Get similar users (those who share similar skills)
      const similarUsers = await this.findSimilarUsers(userId, preferences.skills);
      
      // Get all sources and collect their opportunities
      const sourceResults: RawOpportunity[] = [];
      for (const source of this.sources.values()) {
        try {
          const opportunities = await Promise.race([
            source.getOpportunities(preferences.skills, preferences),
            new Promise<RawOpportunity[]>((_, reject) => 
              setTimeout(() => reject(new Error(`Source ${source.id} timed out`)), this.sourceTimeout)
            )
          ]);
          
          sourceResults.push(...opportunities);
        } catch (error) {
          logger.error(`Error fetching from source ${source.id}: ${error.message}`);
          // Continue with other sources even if one fails
        }
      }
      
      // Filter and sort the opportunities based on user preferences
      const filteredResults = this.filterAndScoreOpportunities(
        sourceResults,
        preferences,
        previousOpportunities.map(o => o.opportunityData)
      );
      
      // Save the discovery results to the user's account
      try {
        const saveResult = await db.insert(monetizationOpportunities).values({
          userId: userId,
          opportunityData: filteredResults,
          createdAt: new Date().toISOString(),
          shared: preferences.discoverable ?? false,
          title: "Generated Opportunities",
          skills: preferences.skills
        });
        
        logger.info(`Saved discovery results for user ${userId}`);
      } catch (error) {
        logger.error(`Error saving discovery results: ${error.message}`);
        // Continue even if saving fails
      }
      
      return {
        opportunities: filteredResults,
        similarUsers,
        enhanced: preferences.useEnhanced ?? false
      };
    } catch (error) {
      logger.error(`Error in discovery service: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Find similar users based on skill matching
   */
  private async findSimilarUsers(userId: number, skills: string[]): Promise<SimilarUser[]> {
    if (!skills.length) return [];
    
    try {
      // Find users with similar skills who have set discoverable to true
      const allUsers = await db.query.users.findMany({
        where: eq(users.discoverable, true)
      });
      
      // Filter out the requesting user
      const otherUsers = allUsers.filter(u => u.id !== userId);
      
      // Get each user's profile to access their skills
      const similarUsers: SimilarUser[] = [];
      
      for (const user of otherUsers) {
        // Get user profile with skills
        const profile = await db.query.userProfiles.findFirst({
          where: eq(users.id, user.id)
        });
        
        if (!profile || !profile.skills) continue;
        
        // Calculate skill overlap
        const userSkills = Array.isArray(profile.skills) 
          ? profile.skills as string[] 
          : [];
        
        const commonSkills = skills.filter(skill => 
          userSkills.some(userSkill => 
            userSkill.toLowerCase() === skill.toLowerCase()
          )
        );
        
        if (commonSkills.length > 0) {
          // Calculate similarity score (0-1)
          const similarity = commonSkills.length / Math.max(skills.length, userSkills.length);
          
          // Count shared opportunities
          const sharedOpps = await db.query.monetizationOpportunities.findMany({
            where: (opps) => eq(opps.userId, user.id && opps.shared)
          });
          
          similarUsers.push({
            id: user.id,
            username: user.username,
            skills: userSkills,
            similarity,
            sharedOpportunities: sharedOpps.length
          });
        }
      }
      
      // Sort by similarity (highest first)
      return similarUsers.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    } catch (error) {
      logger.error(`Error finding similar users: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Filter and score opportunities based on user preferences
   */
  private filterAndScoreOpportunities(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
    previousOpportunities: any[]
  ): RawOpportunity[] {
    // Extract previous opportunity IDs to avoid duplicates
    const previousIds = new Set<string>();
    for (const prevOpp of previousOpportunities) {
      if (Array.isArray(prevOpp)) {
        for (const opp of prevOpp) {
          if (opp && opp.id) previousIds.add(opp.id);
        }
      } else if (prevOpp && prevOpp.id) {
        previousIds.add(prevOpp.id);
      }
    }
    
    // Filter out duplicates
    const uniqueOpportunities = opportunities.filter(opp => !previousIds.has(opp.id));
    
    // TODO: Add more filtering logic based on preferences
    // For example, filter by time requirement, risk level, etc.
    
    // Sort by relevance (for now, just return the first 10)
    return uniqueOpportunities.slice(0, 10);
  }
}

// Create singleton instance
export const discoveryService = new DiscoveryService();

// Initialize with available sources
// The actual source imports and registration will happen in index.ts