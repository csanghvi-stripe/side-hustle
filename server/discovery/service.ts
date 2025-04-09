/**
 * Discovery Service
 * 
 * This service acts as the facade to the discovery engine, managing the registration
 * and coordination of various opportunity sources.
 */

import { DiscoveryPreferences, DiscoveryResults, OpportunitySource, RawOpportunity, SimilarUser, CacheEntry } from './types';
import { RiskLevel } from '../../shared/schema';
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
   * Get all registered sources with a Map interface
   */
  public getRegisteredSources(): Map<string, OpportunitySource> {
    return this.sources;
  }
  
  /**
   * Get opportunities from a specific source
   */
  public async getOpportunitiesFromSource(
    sourceId: string,
    limit: number = 10,
    skills?: string[]
  ): Promise<RawOpportunity[]> {
    const source = this.sources.get(sourceId);
    
    if (!source) {
      throw new Error(`Source with ID ${sourceId} not found`);
    }
    
    try {
      // Create minimal preferences object for the source
      const preferences: DiscoveryPreferences = {
        skills: skills || [],
        timeAvailability: "any",
        riskAppetite: "any",
        incomeGoals: 0,
        workPreference: "any"
      };
      
      const opportunities = await Promise.race([
        source.getOpportunities(skills || [], preferences),
        new Promise<RawOpportunity[]>((_, reject) => 
          setTimeout(() => reject(new Error(`Source ${sourceId} timed out`)), this.sourceTimeout)
        )
      ]);
      
      // Return limited number of opportunities
      return opportunities.slice(0, limit);
    } catch (error) {
      logger.error(`Error fetching from source ${sourceId}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to fetch opportunities from source ${sourceId}`);
    }
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
   * Returns opportunities scored and categorized by relevance
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
    
    // Enhanced filtering based on preferences
    const filteredOpportunities = uniqueOpportunities.filter(opp => {
      // Filter by time requirement if specified
      if (preferences.timeAvailability !== 'any') {
        const maxHoursPerWeek = this.parseTimeAvailability(preferences.timeAvailability);
        if (opp.timeRequired && opp.timeRequired.min > maxHoursPerWeek) {
          return false;
        }
      }
      
      // Filter by risk tolerance if specified
      if (preferences.riskAppetite !== 'any') {
        const userRiskLevel = this.getRiskLevelValue(preferences.riskAppetite);
        const opportunityRiskLevel = this.getRiskLevelValue(opp.entryBarrier);
        
        // Only show opportunities with risk level at or below user's tolerance
        if (opportunityRiskLevel > userRiskLevel) {
          return false;
        }
      }
      
      // Filter by income goals if specified
      if (preferences.incomeGoals > 0) {
        // Check if the opportunity can potentially meet income goals
        // Convert estimated income to monthly basis for comparison
        const monthlyIncomeMin = this.convertToMonthlyIncome(
          opp.estimatedIncome.min, 
          opp.estimatedIncome.timeframe
        );
        
        // Only keep opportunities that can potentially meet at least 25% of income goals
        if (monthlyIncomeMin < (preferences.incomeGoals * 0.25)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Score the opportunities by relevance to user
    const scoredOpportunities = filteredOpportunities.map(opp => {
      // Initial score based on skill match
      let score = this.calculateSkillMatchScore(opp.requiredSkills, preferences.skills);
      
      // Adjust score based on nice-to-have skills
      if (opp.niceToHaveSkills && opp.niceToHaveSkills.length > 0) {
        const niceToHaveScore = this.calculateSkillMatchScore(opp.niceToHaveSkills, preferences.skills) * 0.5;
        score += niceToHaveScore;
      }
      
      // Adjust based on income potential (weight: 20%)
      const incomeScore = this.calculateIncomeScore(opp.estimatedIncome, preferences.incomeGoals);
      score += incomeScore * 0.2;
      
      // Adjust based on time requirement match (weight: 15%)
      const timeScore = this.calculateTimeScore(opp.timeRequired, preferences.timeAvailability);
      score += timeScore * 0.15;
      
      // Adjust based on risk level match (weight: 15%)
      const riskScore = this.calculateRiskScore(opp.entryBarrier, preferences.riskAppetite);
      score += riskScore * 0.15;
      
      // Return opportunity with calculated score
      return {
        ...opp,
        matchScore: Math.min(1, Math.max(0, score)) // Ensure score is between 0-1
      };
    });
    
    // Sort by score (highest first)
    const sortedOpportunities = scoredOpportunities.sort((a, b) => 
      (b.matchScore || 0) - (a.matchScore || 0)
    );
    
    // Return top opportunities (max 15)
    return sortedOpportunities.slice(0, 15);
  }
  
  /**
   * Calculate skill match score between required skills and user skills
   * @returns Score between 0-1
   */
  private calculateSkillMatchScore(requiredSkills: string[], userSkills: string[]): number {
    if (!requiredSkills || requiredSkills.length === 0) return 0.5; // Neutral score for no skills
    
    // Normalize skills to lowercase for comparison
    const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase());
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase());
    
    // Calculate match percentage
    const matchCount = normalizedRequiredSkills.filter(skill => 
      normalizedUserSkills.includes(skill)
    ).length;
    
    return matchCount / normalizedRequiredSkills.length;
  }
  
  /**
   * Calculate income potential score
   * @returns Score between 0-1
   */
  private calculateIncomeScore(
    estimatedIncome: { min: number, max: number, timeframe: string },
    incomeGoal: number
  ): number {
    if (!incomeGoal) return 0.5; // Neutral score if no goal
    
    // Convert to monthly income
    const monthlyIncome = this.convertToMonthlyIncome(
      (estimatedIncome.min + estimatedIncome.max) / 2, // Use average
      estimatedIncome.timeframe
    );
    
    // Calculate ratio of income potential to goal
    const ratio = monthlyIncome / incomeGoal;
    
    // Score based on how close to or exceeding the goal
    if (ratio >= 1.5) return 1.0; // Exceeds goal by 50%
    if (ratio >= 1.0) return 0.9; // Meets goal
    if (ratio >= 0.75) return 0.8; // 75% of goal
    if (ratio >= 0.5) return 0.6; // 50% of goal
    if (ratio >= 0.25) return 0.4; // 25% of goal
    return 0.2; // Less than 25% of goal
  }
  
  /**
   * Calculate time requirement match score
   * @returns Score between 0-1
   */
  private calculateTimeScore(
    timeRequired: { min: number, max: number },
    timeAvailability: string
  ): number {
    const availableHours = this.parseTimeAvailability(timeAvailability);
    if (availableHours === 0) return 0.5; // Neutral score if not specified
    
    // Use the average of min/max required hours
    const requiredHours = (timeRequired.min + timeRequired.max) / 2;
    
    // Calculate how well the time requirement fits availability
    const ratio = requiredHours / availableHours;
    
    // Score based on how well it fits
    if (ratio <= 0.5) return 0.9; // Uses half or less of available time
    if (ratio <= 0.75) return 0.8; // Uses 75% or less of available time
    if (ratio <= 0.9) return 0.7; // Uses 90% or less of available time
    if (ratio <= 1.0) return 0.6; // Just fits within available time
    if (ratio <= 1.25) return 0.4; // Slightly exceeds available time
    if (ratio <= 1.5) return 0.2; // Moderately exceeds available time
    return 0.1; // Significantly exceeds available time
  }
  
  /**
   * Calculate risk match score
   * @returns Score between 0-1
   */
  private calculateRiskScore(entryBarrier: RiskLevel, riskAppetite: string): number {
    const opportunityRisk = this.getRiskLevelValue(entryBarrier);
    const userRiskTolerance = this.getRiskLevelValue(riskAppetite);
    
    // Calculate how well the risk level matches user tolerance
    const diff = userRiskTolerance - opportunityRisk;
    
    if (diff < -1) return 0.2; // Way too risky
    if (diff === -1) return 0.4; // Slightly too risky
    if (diff === 0) return 1.0; // Perfect match
    if (diff === 1) return 0.8; // Safer than user is willing to take
    return 0.6; // Much safer than user is willing to take
  }
  
  /**
   * Convert risk level to numeric value
   * @returns 1=LOW, 2=MEDIUM, 3=HIGH
   */
  private getRiskLevelValue(risk: string): number {
    if (typeof risk !== 'string') return 2; // Default to medium
    
    const riskLower = risk.toLowerCase();
    if (riskLower === 'low' || riskLower === RiskLevel.LOW.toLowerCase()) return 1;
    if (riskLower === 'high' || riskLower === RiskLevel.HIGH.toLowerCase()) return 3;
    return 2; // Default to medium
  }
  
  /**
   * Parse time availability string to hours per week
   * @returns Hours per week
   */
  private parseTimeAvailability(time: string): number {
    if (!time || time === 'any') return 0;
    
    const timeLower = time.toLowerCase();
    if (timeLower.includes('full')) return 40;
    if (timeLower.includes('part')) return 20;
    if (timeLower.includes('evenings')) return 10;
    if (timeLower.includes('weekends')) return 16;
    
    // Try to extract hours
    const hours = parseInt(time);
    if (!isNaN(hours)) return hours;
    
    return 0; // Default if unparseable
  }
  
  /**
   * Convert income to monthly basis for comparison
   */
  private convertToMonthlyIncome(amount: number, timeframe: string): number {
    if (!timeframe) return amount;
    
    const timeframeLower = timeframe.toLowerCase();
    if (timeframeLower === 'hour') return amount * 160; // 40h × 4 weeks
    if (timeframeLower === 'day') return amount * 20; // 5 days × 4 weeks
    if (timeframeLower === 'week') return amount * 4;
    if (timeframeLower === 'month') return amount;
    if (timeframeLower === 'year') return amount / 12;
    if (timeframeLower === 'project') return amount / 3; // Assume 3 months per project avg
    
    return amount; // Default if timeframe unknown
  }
}

// Create singleton instance
export const discoveryService = new DiscoveryService();

// Initialize with available sources
// The actual source imports and registration will happen in index.ts