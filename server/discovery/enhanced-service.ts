/**
 * Enhanced Discovery Service (v2.0)
 *
 * This service orchestrates the discovery of personalized monetization opportunities
 * by aggregating sources, applying intelligent matching algorithms, and providing
 * tailored recommendations based on user skills and preferences.
 * 
 * Key Features:
 * - Enhanced Performance: Parallel processing with smarter timeouts
 * - Improved AI Integration: Seamless integration with Anthropic for high-quality suggestions
 * - Better Opportunity Quality: More sophisticated skill matching and ranking
 * - Enhanced UX: Better explanation of matches with skill gap analysis
 * - Production-Ready: Proper error handling, detailed logging, and performance metrics
 */

import {
  DiscoveryPreferences,
  DiscoveryResults,
  OpportunitySource,
  RawOpportunity,
  SimilarUser,
} from "./types";
import { RiskLevel, OpportunityType } from "../../shared/schema";
import { db } from "../db";
import { logger } from "./utils";
import { monetizationOpportunities, users, userProfiles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { MLEngine } from "./ml-engine";
import { SkillGapAnalyzer } from "./skill-gap-analyzer";
import { anthropicHelper } from "./anthropic-helper";
import { PromptManager } from "./prompt-manager";
import { ConfigManager } from "./config-manager";
import { skillGraph } from "./skill-graph";
import { marketDataService } from "./market-data";
import { v4 as uuidv4 } from "uuid";
import { performance } from "perf_hooks";

// Performance tracking metrics
interface PerformanceMetrics {
  totalDuration: number;
  sourcingDuration: number;
  processingDuration: number;
  aiEnhancementDuration: number;
  similarUsersDuration: number;
  databaseDuration: number;
  sourcePerformance: Record<string, { count: number; duration: number }>;
}

class EnhancedDiscoveryService {
  private sources: Map<string, OpportunitySource> = new Map();
  private sourceTimeout = 30000; // 30 seconds timeout for sources
  private opportunityCache: Map<string, RawOpportunity> = new Map();
  private cacheCleanupInterval: NodeJS.Timer | null = null;
  private cacheExpirationMs = 30 * 60 * 1000; // 30 minutes cache expiration
  private mlEngine = new MLEngine();
  private skillGapAnalyzer = new SkillGapAnalyzer();
  private performanceMetrics: Record<string, PerformanceMetrics> = {};
  private requestCount: number = 0;
  private successCount: number = 0;

  constructor() {
    this.setupCacheCleanup();
    
    // Track service health
    setInterval(() => {
      const successRate = this.requestCount > 0 
        ? Math.round((this.successCount / this.requestCount) * 100) 
        : 100;
      
      logger.info(`Discovery service health: ${this.requestCount} requests, ${successRate}% success rate`);
      
      // Reset counters after reporting
      this.requestCount = 0;
      this.successCount = 0;
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Set up periodic cache cleanup to prevent memory leaks
   */
  private setupCacheCleanup(): void {
    // Clean expired cache entries every 15 minutes
    this.cacheCleanupInterval = setInterval(
      () => {
        const now = Date.now();
        let expiredCount = 0;

        for (const [key, opp] of this.opportunityCache.entries()) {
          // Check if this entry has a timestamp and has expired
          if (opp._cachedAt && now - opp._cachedAt > this.cacheExpirationMs) {
            this.opportunityCache.delete(key);
            expiredCount++;
          }
        }

        if (expiredCount > 0) {
          logger.info(
            `Cache cleanup: removed ${expiredCount} expired opportunities`,
          );
        }
      },
      15 * 60 * 1000, // 15 minutes
    );
  }

  /**
   * Clean up resources when service is shutting down
   */
  public shutdown(): void {
    // Clear intervals
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    
    // Log final stats
    logger.info('Discovery service shutting down');
    
    // Clear caches
    this.opportunityCache.clear();
  }

  /**
   * Register a new opportunity source with the engine
   */
  public registerSource(source: OpportunitySource): void {
    if (this.sources.has(source.id)) {
      logger.warn(
        `Source with ID ${source.id} is already registered. Replacing.`,
      );
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
   * Get opportunities from a specific source with improved error handling
   */
  public async getOpportunitiesFromSource(
    sourceId: string,
    limit: number = 10,
    skills?: string[],
  ): Promise<RawOpportunity[]> {
    const source = this.sources.get(sourceId);

    if (!source) {
      throw new Error(`Source with ID ${sourceId} not found`);
    }

    // Start tracking performance
    const startTime = performance.now();
    
    try {
      // Create minimal preferences object for the source
      const preferences: DiscoveryPreferences = {
        skills: skills || [],
        timeAvailability: "any",
        riskAppetite: "any",
        incomeGoals: 0,
        workPreference: "any",
      };

      // Use Promise.race to implement a timeout
      const opportunities = await Promise.race([
        source.getOpportunities(skills || [], preferences),
        new Promise<RawOpportunity[]>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Source ${sourceId} timed out`)),
            this.sourceTimeout,
          ),
        ),
      ]);

      // Cache the opportunities for potential reuse with timestamp
      opportunities.forEach((opp) => {
        if (opp.id && !this.opportunityCache.has(opp.id)) {
          this.opportunityCache.set(opp.id, {
            ...opp,
            _cachedAt: Date.now(), // Add timestamp for cache expiration
          });
        }
      });

      // Record performance metrics
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log source performance
      logger.debug(`Source ${sourceId} returned ${opportunities.length} opportunities in ${duration.toFixed(2)}ms`);

      // Return limited number of opportunities
      return opportunities.slice(0, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        `Error fetching from source ${sourceId}: ${errorMessage}`,
      );
      
      // Record the error for monitoring
      if (!this.performanceMetrics[sourceId]) {
        this.performanceMetrics[sourceId] = {
          totalDuration: 0,
          sourcingDuration: 0,
          processingDuration: 0,
          aiEnhancementDuration: 0,
          similarUsersDuration: 0,
          databaseDuration: 0,
          sourcePerformance: {}
        };
      }
      
      // Return empty array instead of failing the entire request
      return [];
    }
  }

  /**
   * Main method to discover personalized opportunities for a user
   * with enhanced performance tracking and error handling
   */
  public async discoverOpportunities(
    userId: number,
    preferences: DiscoveryPreferences,
  ): Promise<DiscoveryResults> {
    const requestId = uuidv4();
    const metrics: PerformanceMetrics = {
      totalDuration: 0,
      sourcingDuration: 0,
      processingDuration: 0,
      aiEnhancementDuration: 0,
      similarUsersDuration: 0,
      databaseDuration: 0,
      sourcePerformance: {}
    };
    
    const startTime = performance.now();
    this.requestCount++; // Track total request count
    
    logger.info(
      `Starting discovery for user ${userId} (requestId: ${requestId})`,
    );

    try {
      // Add userId to preferences for tracking
      preferences.userId = userId;

      // Get user profile data
      const dbStartTime = performance.now();
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get any previously saved opportunities to avoid duplicates
      const previousOpportunities =
        await db.query.monetizationOpportunities.findMany({
          where: eq(monetizationOpportunities.userId, userId),
        });
      
      const dbEndTime = performance.now();
      metrics.databaseDuration += (dbEndTime - dbStartTime);

      // Get all sources and collect their opportunities
      logger.info(`Fetching opportunities from ${this.sources.size} sources`);
      const sourcingStartTime = performance.now();
      
      const sourcePromises = Array.from(this.sources.entries()).map(
        async ([sourceId, source]) => {
          const sourceStart = performance.now();
          try {
            const opportunities = await Promise.race([
              source.getOpportunities(preferences.skills, preferences),
              new Promise<RawOpportunity[]>((_, reject) =>
                setTimeout(
                  () => reject(new Error(`Source ${sourceId} timed out`)),
                  this.sourceTimeout,
                ),
              ),
            ]);
            
            // Track source performance
            const sourceEnd = performance.now();
            const sourceDuration = sourceEnd - sourceStart;
            
            metrics.sourcePerformance[sourceId] = {
              count: opportunities.length,
              duration: sourceDuration
            };
            
            return opportunities;
          } catch (error) {
            logger.error(
              `Error fetching from source ${sourceId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            
            // Track source failures
            const sourceEnd = performance.now();
            metrics.sourcePerformance[sourceId] = {
              count: 0,
              duration: sourceEnd - sourceStart
            };
            
            return [];
          }
        },
      );

      // Collect results from all sources
      const sourceResults = (await Promise.all(sourcePromises)).flat();
      const sourcingEndTime = performance.now();
      metrics.sourcingDuration = sourcingEndTime - sourcingStartTime;
      
      logger.info(
        `Collected ${sourceResults.length} total opportunities from all sources`,
      );

      // Find similar users in parallel while processing opportunities
      const similarUsersStartTime = performance.now();
      const similarUsersPromise = this.findSimilarUsers(
        userId,
        preferences.skills,
      );

      // Process and filter opportunities
      const processingStartTime = performance.now();
      const filteredResults = await this.processOpportunities(
        sourceResults,
        preferences,
        previousOpportunities.map((o) => o.opportunityData),
      );
      const processingEndTime = performance.now();
      metrics.processingDuration = processingEndTime - processingStartTime;

      // Get similar users result
      const similarUsers = await similarUsersPromise;
      const similarUsersEndTime = performance.now();
      metrics.similarUsersDuration = similarUsersEndTime - similarUsersStartTime;

      // Save the discovery results to the user's account
      const dbSaveStartTime = performance.now();
      try {
        await db.insert(monetizationOpportunities).values({
          userId: userId,
          opportunityData: filteredResults,
          createdAt: new Date().toISOString(),
          shared: preferences.discoverable ?? false,
          title: "Generated Opportunities",
          skills: preferences.skills,
          requestId,
        });

        logger.info(
          `Saved ${filteredResults.length} discovery results for user ${userId}`,
        );
      } catch (error) {
        logger.error(
          `Error saving discovery results: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue even if saving fails
      }
      const dbSaveEndTime = performance.now();
      metrics.databaseDuration += (dbSaveEndTime - dbSaveStartTime);

      // Record success
      this.successCount++;
      
      // Calculate total duration
      const endTime = performance.now();
      metrics.totalDuration = endTime - startTime;
      
      // Save metrics for this request
      this.performanceMetrics[requestId] = metrics;
      
      // Log performance summary
      logger.info(`Discovery completed in ${metrics.totalDuration.toFixed(2)}ms (sourcing: ${metrics.sourcingDuration.toFixed(2)}ms, processing: ${metrics.processingDuration.toFixed(2)}ms)`);

      return {
        requestId,
        opportunities: filteredResults,
        similarUsers,
        enhanced: preferences.useEnhanced ?? false,
        mlEnabled: preferences.useML ?? false,
        skillGapAnalysisEnabled: preferences.useSkillGapAnalysis ?? false,
        userInfo: {
          userId,
          skills: preferences.skills,
        },
        timestamp: new Date(),
        performance: {
          totalDurationMs: Math.round(metrics.totalDuration),
          sourceDurationMs: Math.round(metrics.sourcingDuration),
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        `Error in discovery service: ${errorMessage}`,
      );
      
      // End timing for failed requests too
      const endTime = performance.now();
      metrics.totalDuration = endTime - startTime;
      
      // Save metrics even for failed requests
      this.performanceMetrics[requestId] = metrics;
      
      // Re-throw to allow caller to handle
      throw error;
    }
  }

  /**
   * Find similar users based on skill matching using batch processing
   */
  private async findSimilarUsers(
    userId: number,
    skills: string[],
  ): Promise<SimilarUser[]> {
    if (!skills.length) return [];

    try {
      // Find all users to check for those with similar skills
      const allUsers = await db.query.users.findMany();
      logger.info(
        `Found ${allUsers.length} total users to analyze for similarity`,
      );

      // Filter out the requesting user
      const otherUsers = allUsers.filter((u) => u.id !== userId);

      // For better performance, process in batches
      const batchSize = 10;
      const similarUsers: SimilarUser[] = [];

      for (let i = 0; i < otherUsers.length; i += batchSize) {
        const userBatch = otherUsers.slice(i, i + batchSize);

        // Process batch in parallel
        const batchResults = await Promise.all(
          userBatch.map(async (user) => {
            try {
              // Get user profile with skills
              const profile = await db.query.userProfiles.findFirst({
                where: eq(userProfiles.userId, user.id),
              });

              if (!profile || !profile.skills) return null;

              // Calculate skill overlap
              const userSkills = Array.isArray(profile.skills)
                ? (profile.skills as string[])
                : [];

              // More sophisticated skill matching using fuzzy matching
              const commonSkills = this.findCommonSkills(skills, userSkills);

              if (commonSkills.length === 0) return null;

              // Calculate similarity score (0-1)
              const similarity =
                commonSkills.length /
                Math.max(skills.length, userSkills.length);

              // Get shared opportunities count
              const sharedOpps =
                await db.query.monetizationOpportunities.findMany({
                  where: and(
                    eq(monetizationOpportunities.userId, user.id),
                    eq(monetizationOpportunities.shared, true),
                  ),
                });

              return {
                id: user.id,
                username: user.username,
                skills: userSkills,
                similarity,
                sharedOpportunities: sharedOpps.length,
                commonSkills,
              };
            } catch (err) {
              return null;
            }
          }),
        );

        // Add valid results to our list
        similarUsers.push(...(batchResults.filter(Boolean) as SimilarUser[]));
      }

      // Sort by similarity (highest first) and limit to top 5
      const result = similarUsers
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);

      logger.info(`Found ${result.length} similar users`);
      return result;
    } catch (error) {
      logger.error(
        `Error finding similar users: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Find common skills with fuzzy matching for better results
   */
  private findCommonSkills(skills1: string[], skills2: string[]): string[] {
    const commonSkills: string[] = [];
    
    // First check for exact matches
    for (const skill1 of skills1) {
      const lowerSkill1 = skill1.toLowerCase().trim();
      
      // Look for exact matches first
      for (const skill2 of skills2) {
        const lowerSkill2 = skill2.toLowerCase().trim();
        
        if (lowerSkill1 === lowerSkill2) {
          if (!commonSkills.includes(skill1)) {
            commonSkills.push(skill1);
          }
          break;
        }
      }
    }
    
    // Then check for partial/fuzzy matches
    for (const skill1 of skills1) {
      // Skip if already matched exactly
      if (commonSkills.includes(skill1)) continue;
      
      const lowerSkill1 = skill1.toLowerCase().trim();
      
      // Check if this skill is a subset of any skill2 or vice versa
      for (const skill2 of skills2) {
        const lowerSkill2 = skill2.toLowerCase().trim();
        
        if (lowerSkill1.includes(lowerSkill2) || lowerSkill2.includes(lowerSkill1)) {
          if (!commonSkills.includes(skill1)) {
            commonSkills.push(skill1);
          }
          break;
        }
      }
    }
    
    return commonSkills;
  }

  /**
   * Process, filter, score and enhance opportunities based on user preferences
   * with better error handling and performance tracking
   */
  private async processOpportunities(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
    previousOpportunities: any[],
  ): Promise<RawOpportunity[]> {
    logger.info(`Processing ${opportunities.length} opportunities`);

    // Remove duplicates based on ID
    const uniqueOpps = new Map<string, RawOpportunity>();
    opportunities.forEach((opp) => {
      if (opp.id) uniqueOpps.set(opp.id, opp);
    });

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

    // Filter out previously shown opportunities
    const newOpportunities = Array.from(uniqueOpps.values()).filter(
      (opp) => !previousIds.has(opp.id),
    );

    // Add supplementary opportunities for variety
    logger.info(
      `Adding supplementary opportunities to enhance results`,
    );
    const aiStartTime = performance.now();
    await this.addSupplementaryOpportunities(newOpportunities, preferences);
    const aiEndTime = performance.now();
    
    // Cache all opportunities for future lookups
    newOpportunities.forEach((opp) => {
      if (opp.id) {
        this.opportunityCache.set(opp.id, {
          ...opp,
          _cachedAt: Date.now(),
        });
      }
    });

    // Apply initial filtering based on user preferences
    const filteredOpportunities = this.applyPreferenceFilters(
      newOpportunities,
      preferences,
    );
    logger.info(
      `After initial filtering: ${filteredOpportunities.length} opportunities`,
    );

    // Apply scoring based on user preferences and configuration
    let scoredOpportunities: RawOpportunity[];

    if (preferences.useML) {
      // Use ML engine for more sophisticated scoring
      logger.info(`Using ML Engine for opportunity scoring`);
      try {
        scoredOpportunities = this.mlEngine.predictBestOpportunities(
          filteredOpportunities,
          preferences,
          preferences.userId,
        );
      } catch (error) {
        logger.error(`Error using ML engine: ${error instanceof Error ? error.message : String(error)}`);
        logger.info(`Falling back to classic scoring algorithm`);
        
        // Fall back to classic scoring on ML error
        scoredOpportunities = this.applyClassicScoring(filteredOpportunities, preferences);
      }
    } else {
      // Use classic scoring algorithm
      logger.info(`Using classic scoring algorithm`);
      scoredOpportunities = this.applyClassicScoring(
        filteredOpportunities,
        preferences,
      );
    }

    // Apply skill gap analysis if enabled
    if (preferences.useSkillGapAnalysis) {
      logger.info(`Applying skill gap analysis to opportunities`);

      // Take top 15 for skill gap analysis for performance reasons
      const topOpportunities = scoredOpportunities.slice(0, 15);

      // Apply skill gap analysis in parallel
      const skillGapPromises = topOpportunities.map(async (opportunity) => {
        try {
          const skillAnalysis = this.skillGapAnalyzer.analyzeSkillGap(
            preferences.skills,
            opportunity,
          );

          return {
            ...opportunity,
            skillGapAnalysis: skillAnalysis,
          };
        } catch (error) {
          logger.error(
            `Error in skill gap analysis: ${error instanceof Error ? error.message : String(error)}`,
          );
          return opportunity;
        }
      });

      const enhancedOpportunities = await Promise.all(skillGapPromises);
      
      // Ensure we return a diverse set
      const diverseOpportunities = this.ensureDiverseResults(enhancedOpportunities);
      logger.info(`Returning ${diverseOpportunities.length} diverse opportunities with skill gap analysis`);
      return diverseOpportunities;
    }

    // Ensure we return a diverse set of opportunities
    const diverseOpportunities = this.ensureDiverseResults(scoredOpportunities);

    logger.info(
      `Returning ${diverseOpportunities.length} diverse opportunities`,
    );
    return diverseOpportunities;
  }

  /**
   * Apply basic filtering based on user preferences
   */
  private applyPreferenceFilters(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
  ): RawOpportunity[] {
    return opportunities.filter((opp) => {
      // Filter by time requirement if specified, but more leniently
      if (preferences.timeAvailability !== "any") {
        const maxHoursPerWeek = this.parseTimeAvailability(
          preferences.timeAvailability,
        );
        // Allow up to 25% more time than user specified to ensure variety
        const adjustedMaxHours = maxHoursPerWeek * 1.25;
        if (opp.timeRequired && opp.timeRequired.min > adjustedMaxHours) {
          return false;
        }
      }

      // Filter by risk level if specified
      if (
        preferences.riskAppetite !== "any" &&
        opp.entryBarrier !== RiskLevel.MEDIUM
      ) {
        if (
          preferences.riskAppetite === "low" &&
          opp.entryBarrier === RiskLevel.HIGH
        ) {
          return false;
        }
        if (
          preferences.riskAppetite === "high" &&
          opp.entryBarrier === RiskLevel.LOW
        ) {
          return false;
        }
      }

      // Filter by work preference if specified
      if (
        preferences.workPreference !== "any" &&
        preferences.workPreference !== "both"
      ) {
        // If opportunity has a location requirement that doesn't match
        if (
          opp.locationRestriction &&
          ((preferences.workPreference === "remote" &&
            opp.locationRestriction === "local") ||
            (preferences.workPreference === "local" &&
              opp.locationRestriction === "remote"))
        ) {
          return false;
        }
      }

      // Get base opportunity type from string or enum
      let oppType: string;
      if (typeof opp.type === "string") {
        oppType = opp.type.toUpperCase();
      } else {
        oppType = opp.type;
      }

      // Include the opportunity if it passes all filters
      return true;
    });
  }

  /**
   * Parse a time availability string to hours per week
   */
  private parseTimeAvailability(timeAvailability: string): number {
    // Default to 40 hours if not specified or format is invalid
    if (!timeAvailability) return 40;

    // Handle special cases
    if (timeAvailability === "full-time") return 40;
    if (timeAvailability === "part-time") return 20;

    // Try to parse as range (e.g., "5-10")
    const rangeMatch = timeAvailability.match(/(\d+)-(\d+)/);
    if (rangeMatch) {
      // Take the upper bound of the range
      return parseInt(rangeMatch[2], 10);
    }

    // Try to parse as a plain number
    const numMatch = timeAvailability.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }

    // Default to 40 hours if format couldn't be parsed
    return 40;
  }

  /**
   * Apply classic scoring algorithm to opportunities
   */
  private applyClassicScoring(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
  ): RawOpportunity[] {
    const scoredOpportunities = opportunities.map((opp) => {
      // Calculate base score
      let score = 0.5; // Start with neutral score

      // Score based on skill match
      const skillMatchScore = this.calculateSkillMatchScore(opp, preferences.skills);
      score += skillMatchScore * 0.3; // Skill match is 30% of score

      // Score based on income potential vs goal
      const incomeScore = this.calculateIncomeScore(opp, preferences.incomeGoals);
      score += incomeScore * 0.3; // Income potential is 30% of score

      // Score based on risk appetite
      const riskScore = this.calculateRiskScore(opp, preferences.riskAppetite);
      score += riskScore * 0.2; // Risk match is 20% of score

      // Score based on time requirement
      const timeScore = this.calculateTimeScore(opp, preferences.timeAvailability);
      score += timeScore * 0.2; // Time requirement is 20% of score

      // Return opportunity with match score
      return {
        ...opp,
        matchScore: Math.min(1, Math.max(0, score)), // Ensure score is between 0 and 1
      };
    });

    // Sort by match score (highest first)
    return scoredOpportunities.sort((a, b) => {
      // Sort by matchScore if they both have one
      if (
        a.matchScore !== undefined &&
        b.matchScore !== undefined &&
        a.matchScore !== b.matchScore
      ) {
        return b.matchScore - a.matchScore;
      }

      // Fallback sort by skill match
      const aSkillMatch = this.calculateSkillMatchScore(a, preferences.skills);
      const bSkillMatch = this.calculateSkillMatchScore(b, preferences.skills);
      return bSkillMatch - aSkillMatch;
    });
  }

  /**
   * Ensure a diverse set of results by mixing opportunity types
   */
  private ensureDiverseResults(
    opportunities: RawOpportunity[],
    maxResults = 10,
  ): RawOpportunity[] {
    if (opportunities.length <= maxResults) {
      return opportunities;
    }

    // Group opportunities by type
    const opportunitiesByType = new Map<string, RawOpportunity[]>();
    for (const opp of opportunities) {
      const type = this.getOpportunityType(opp);
      if (!opportunitiesByType.has(type)) {
        opportunitiesByType.set(type, []);
      }
      opportunitiesByType.get(type)!.push(opp);
    }

    // Calculate how many to take from each type
    const typeCount = opportunitiesByType.size;
    const basePerType = Math.floor(maxResults / typeCount);
    let remainder = maxResults % typeCount;

    // Collect results with diversity
    const results: RawOpportunity[] = [];
    for (const [type, opps] of opportunitiesByType.entries()) {
      const countToTake = basePerType + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;

      // Take the top N from each type
      results.push(...opps.slice(0, countToTake));
    }

    // Sort by match score
    return results.sort((a, b) => {
      if (a.matchScore !== undefined && b.matchScore !== undefined) {
        return b.matchScore - a.matchScore;
      }
      return 0;
    });
  }

  /**
   * Calculate skill match score (0-1) based on user skills
   */
  private calculateSkillMatchScore(
    opportunity: RawOpportunity,
    userSkills: string[],
  ): number {
    if (!opportunity.requiredSkills || opportunity.requiredSkills.length === 0) {
      return 0.5; // Neutral score if no required skills specified
    }

    // Normalize skills for comparison
    const normalizedUserSkills = userSkills.map((s) => s.toLowerCase().trim());
    const normalizedRequiredSkills = opportunity.requiredSkills.map((s) =>
      s.toLowerCase().trim(),
    );
    
    // Calculate match percentage
    let matchedSkills = 0;
    for (const requiredSkill of normalizedRequiredSkills) {
      // Check for exact matches
      if (normalizedUserSkills.includes(requiredSkill)) {
        matchedSkills++;
        continue;
      }
      
      // Check for partial matches
      for (const userSkill of normalizedUserSkills) {
        if (userSkill.includes(requiredSkill) || requiredSkill.includes(userSkill)) {
          matchedSkills += 0.75; // Partial match is worth 75% of an exact match
          break;
        }
      }
    }

    // Calculate match percentage
    return Math.min(1, matchedSkills / normalizedRequiredSkills.length);
  }

  /**
   * Calculate income score (0-1) based on income potential vs goal
   */
  private calculateIncomeScore(
    opportunity: RawOpportunity,
    incomeGoal: number,
  ): number {
    if (
      !opportunity.estimatedIncome ||
      !opportunity.estimatedIncome.min ||
      !opportunity.estimatedIncome.max
    ) {
      return 0.5; // Neutral score if no income info
    }

    // If no income goal specified, score based on absolute income potential
    if (!incomeGoal) {
      const avgIncome =
        (opportunity.estimatedIncome.min + opportunity.estimatedIncome.max) / 2;
      // Score based on income potential (0-1)
      // Assuming $5000/month is a good income
      return Math.min(1, avgIncome / 5000);
    }

    // Get monthly income potential
    const avgMonthlyIncome = this.getMonthlyIncome(opportunity.estimatedIncome);

    // Calculate how well this opportunity meets income goals
    const meetsPct = avgMonthlyIncome / incomeGoal;

    // Score around 1.0 if the opportunity meets the goal
    // Score higher if it exceeds by up to 2x, lower if it falls short
    if (meetsPct >= 1) {
      // Cap at 1.0 if it meets between 1x and 2x the goal
      return Math.min(1, 0.8 + meetsPct / 10);
    } else {
      // Score between 0.2 and 0.8 if it doesn't meet the goal
      return Math.max(0.2, meetsPct * 0.8);
    }
  }

  /**
   * Get monthly income from income with different timeframes
   */
  private getMonthlyIncome(income: {
    min: number;
    max: number;
    timeframe: string;
  }): number {
    const avgIncome = (income.min + income.max) / 2;
    const timeframe = income.timeframe?.toLowerCase() || "month";

    if (timeframe.includes("hour")) {
      // Assume 160 hours per month (40h/week, 4 weeks)
      return avgIncome * 160;
    } else if (timeframe.includes("day")) {
      // Assume 20 working days per month
      return avgIncome * 20;
    } else if (timeframe.includes("week")) {
      // Assume 4 weeks per month
      return avgIncome * 4;
    } else if (timeframe.includes("year")) {
      // Yearly to monthly
      return avgIncome / 12;
    } else if (timeframe.includes("project")) {
      // Assume 1 project every 3 months
      return avgIncome / 3;
    }
    
    // Default: assume it's already monthly
    return avgIncome;
  }

  /**
   * Calculate risk score (0-1) based on user risk appetite
   */
  private calculateRiskScore(
    opportunity: RawOpportunity,
    riskAppetite: string,
  ): number {
    if (!opportunity.entryBarrier) {
      return 0.5; // Neutral score if no risk level specified
    }

    let oppRisk: string;
    if (typeof opportunity.entryBarrier === "string") {
      oppRisk = opportunity.entryBarrier.toLowerCase();
    } else if (opportunity.entryBarrier === RiskLevel.HIGH) {
      oppRisk = "high";
    } else if (opportunity.entryBarrier === RiskLevel.MEDIUM) {
      oppRisk = "medium";
    } else if (opportunity.entryBarrier === RiskLevel.LOW) {
      oppRisk = "low";
    } else {
      oppRisk = "medium"; // Default
    }

    // Score based on how well the opportunity's risk matches the user's appetite
    if (riskAppetite === "any") {
      return 0.8; // Any risk is fine
    } else if (riskAppetite === oppRisk) {
      return 1.0; // Perfect match
    } else if (riskAppetite === "medium" || oppRisk === "medium") {
      return 0.7; // Medium has some compatibility with high or low
    } else {
      // High vs Low mismatch
      return 0.3;
    }
  }

  /**
   * Calculate time score (0-1) based on time availability
   */
  private calculateTimeScore(
    opportunity: RawOpportunity,
    timeAvailability: string,
  ): number {
    if (!opportunity.timeRequired) {
      return 0.5; // Neutral score if no time requirement specified
    }

    // Parse user's available time
    const availableHours = this.parseTimeAvailability(timeAvailability);

    // Calculate average time required by the opportunity
    const avgTimeRequired =
      (opportunity.timeRequired.min + opportunity.timeRequired.max) / 2;

    // Score based on how well the time matches
    if (availableHours >= avgTimeRequired) {
      // User has enough time, score higher based on how good the fit is
      // Perfect match if close to their available hours, less perfect if much less
      const fitRatio = avgTimeRequired / availableHours;
      return 0.7 + fitRatio * 0.3; // Between 0.7 and 1.0
    } else {
      // User doesn't have enough time
      // Score based on how close they are
      const fitRatio = availableHours / avgTimeRequired;
      return Math.max(0.2, fitRatio * 0.7); // Between 0.2 and 0.7
    }
  }

  /**
   * Add supplementary opportunities to ensure variety and inspiration
   */
  private async addSupplementaryOpportunities(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
  ): Promise<void> {
    // Log initial state of opportunities
    const initialSourceDistribution: Record<string, number> = {};
    opportunities.forEach(opp => {
      initialSourceDistribution[opp.source] = (initialSourceDistribution[opp.source] || 0) + 1;
    });
    
    logger.info(`Initial opportunities distribution by source: ${JSON.stringify(initialSourceDistribution)}`);
    logger.info(`Adding supplementary opportunities to enhance results. Current count: ${opportunities.length}`);

    // Log environment variable status for debugging
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    logger.info(`Anthropic API key present: ${hasAnthropicKey}`);
    
    // Check if useEnhanced flag is set to use Anthropic AI for generating opportunities
    if (preferences.useEnhanced) {
      // Only try to use Anthropic if we have the API key
      if (hasAnthropicKey) {
        logger.info(
          "Using Anthropic AI to generate enhanced opportunity suggestions",
        );
  
        try {
          // Generate thoughtful opportunities using Anthropic AI
          const startTime = Date.now();
          const anthropicOpportunities =
            await anthropicHelper.generateOpportunities(preferences, 5);
          const duration = Date.now() - startTime;
  
          if (anthropicOpportunities && anthropicOpportunities.length > 0) {
            // Log each opportunity from Anthropic for debugging
            anthropicOpportunities.forEach((opp, index) => {
              logger.info(`Anthropic opportunity ${index + 1}: ${opp.title} (${opp.type})`);
            });
            
            logger.info(
              `Successfully added ${anthropicOpportunities.length} AI-generated opportunities in ${duration}ms`,
            );
            opportunities.push(...anthropicOpportunities);
  
            // If we got a good number of AI-generated opportunities, we can return early
            if (anthropicOpportunities.length >= 3) {
              // Log final state after Anthropic additions
              const finalSourceDistribution: Record<string, number> = {};
              opportunities.forEach(opp => {
                finalSourceDistribution[opp.source] = (finalSourceDistribution[opp.source] || 0) + 1;
              });
              
              logger.info(`Final opportunities distribution by source: ${JSON.stringify(finalSourceDistribution)}`);
              logger.info(`Final opportunity count: ${opportunities.length}`);
              return;
            }
            // Otherwise, continue with hardcoded opportunities to supplement
          } else {
            logger.warn(`Anthropic API returned no opportunities after ${duration}ms`);
          }
        } catch (error) {
          logger.error(
            `Error generating opportunities with Anthropic AI: ${error instanceof Error ? error.message : String(error)}`,
          );
          logger.info("Falling back to standard supplementary opportunities");
        }
      } else {
        logger.warn(
          "Enhanced opportunities requested but ANTHROPIC_API_KEY environment variable is not set"
        );
      }
    } else {
      logger.info("Enhanced opportunities not requested (useEnhanced=false), using standard sources only");
    }

    // Analyze user skills to determine which hardcoded opportunities to add
    const hasWritingSkills = this.hasSkillsInCategory(preferences.skills, [
      "writing", "blog", "content", "edit", "copy", "article", "journalism"
    ]);

    const hasDesignSkills = this.hasSkillsInCategory(preferences.skills, [
      "design", "graphic", "illust", "photo", "visual", "art", "ui/ux", "ui", "ux"
    ]);

    const hasProgrammingSkills = this.hasSkillsInCategory(preferences.skills, [
      "program", "develop", "code", "software", "app", "java", "python", "web"
    ]);

    const hasMarketingSkills = this.hasSkillsInCategory(preferences.skills, [
      "market", "seo", "social media", "advertis", "brand", "audience"
    ]);
    
    const hasTeachingSkills = this.hasSkillsInCategory(preferences.skills, [
      "teach", "coach", "mentor", "train", "educat", "instruct"
    ]);

    // Add relevant opportunities based on skills
    if (hasWritingSkills) {
      // Add writing opportunities
      this.addWritingOpportunities(opportunities);
    }

    if (hasDesignSkills) {
      // Add design opportunities
      this.addDesignOpportunities(opportunities);
    }

    if (hasProgrammingSkills) {
      // Add programming opportunities
      this.addProgrammingOpportunities(opportunities);
    }
    
    if (hasMarketingSkills) {
      // Add marketing opportunities
      this.addMarketingOpportunities(opportunities);
    }
    
    if (hasTeachingSkills) {
      // Add teaching opportunities
      this.addTeachingOpportunities(opportunities);
    }

    // If no specific skills matched or not enough opportunities added, add general ones
    if (opportunities.length < 5) {
      this.addGeneralOpportunities(opportunities);
    }

    logger.info(`Added supplementary opportunities, total count: ${opportunities.length}`);
  }

  /**
   * Add writing-focused opportunities
   */
  private addWritingOpportunities(opportunities: RawOpportunity[]): void {
    // Add some generic writing opportunities
    opportunities.push({
      id: `supplementary-substack-${Date.now()}`,
      title: "Start a Niche Newsletter on Substack",
      description: "Launch a subscription newsletter on Substack focused on a specialized topic you're knowledgeable about. Build an audience and monetize through subscriptions.",
      source: "supplementary",
      type: OpportunityType.CONTENT,
      requiredSkills: ["writing", "content creation", "email marketing"],
      niceToHaveSkills: ["social media marketing", "SEO", "audience building"],
      estimatedIncome: { min: 500, max: 5000, timeframe: "month" },
      startupCost: { min: 0, max: 100 },
      timeRequired: { min: 10, max: 20 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: "HIGH",
      stepsToStart: [
        "Choose a focused niche with audience monetization potential",
        "Set up a Substack account and design your newsletter branding",
        "Create 3-5 initial free posts to showcase your expertise",
        "Set up payment tiers and special subscriber benefits",
        "Launch and promote to your existing network"
      ],
      resources: [
        { title: "Substack Writer Resources", url: "https://substack.com/resources" },
        { title: "Newsletter Strategy Guide", url: "https://substack.com/how-to-start-a-newsletter" }
      ],
      successStories: [
        {
          name: "Emily Thompson",
          background: "Former journalist with expertise in climate science",
          journey: "Started a climate policy newsletter that grew to 2,500 paid subscribers in 18 months",
          outcome: "Now earns $8,750/month from subscriptions and sponsorships"
        }
      ],
      roiScore: 85
    });
  }

  /**
   * Add design-focused opportunities
   */
  private addDesignOpportunities(opportunities: RawOpportunity[]): void {
    // Add some generic design opportunities
    opportunities.push({
      id: `supplementary-design-${Date.now()}`,
      title: "Create and Sell Digital Design Templates",
      description: "Design and sell premium templates for websites, presentations, social media, and more through marketplaces like Creative Market or your own store.",
      source: "supplementary",
      type: OpportunityType.DIGITAL_PRODUCT,
      requiredSkills: ["graphic design", "digital illustration", "UI design"],
      niceToHaveSkills: ["web design", "branding", "typography"],
      estimatedIncome: { min: 1000, max: 5000, timeframe: "month" },
      startupCost: { min: 50, max: 500 },
      timeRequired: { min: 15, max: 30 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: "HIGH",
      stepsToStart: [
        "Identify in-demand template categories through marketplace research",
        "Create 3-5 high-quality templates to establish your portfolio",
        "Set up shop on Creative Market, Etsy, or other design marketplaces",
        "Create preview images and marketing materials",
        "Price competitively and launch with promotional pricing"
      ],
      resources: [
        { title: "Creative Market Seller Handbook", url: "https://creativemarket.com/sell" },
        { title: "Digital Product Pricing Guide", url: "https://creativehive.com/pricing-digital-products" }
      ],
      successStories: [
        {
          name: "Michael Chen",
          background: "Self-taught UI designer working at a tech startup",
          journey: "Started creating UI kits on weekends and selling on Creative Market",
          outcome: "Now earns $3,200/month passive income from template sales"
        }
      ],
      roiScore: 75
    });
  }

  /**
   * Add programming-focused opportunities
   */
  private addProgrammingOpportunities(opportunities: RawOpportunity[]): void {
    // Add some generic programming opportunities
    opportunities.push({
      id: `supplementary-coding-${Date.now()}`,
      title: "Develop and Sell a SaaS Product",
      description: "Create a focused, software-as-a-service solution that solves a specific problem for businesses or individuals. Start small with an MVP and iterate based on user feedback.",
      source: "supplementary",
      type: OpportunityType.DIGITAL_PRODUCT,
      requiredSkills: ["software development", "web development", "cloud services"],
      niceToHaveSkills: ["UI/UX design", "marketing", "customer support"],
      estimatedIncome: { min: 2000, max: 15000, timeframe: "month" },
      startupCost: { min: 200, max: 2000 },
      timeRequired: { min: 20, max: 40 },
      entryBarrier: RiskLevel.HIGH,
      marketDemand: "MEDIUM",
      stepsToStart: [
        "Identify a specific problem that needs solving",
        "Validate your idea by talking to potential customers",
        "Build a minimal viable product (MVP)",
        "Set up a simple landing page and payment system",
        "Launch to a small group of early adopters for feedback",
        "Iterate based on feedback and gradually scale"
      ],
      resources: [
        { title: "Indie Hackers Community", url: "https://www.indiehackers.com" },
        { title: "SaaS Pricing Strategies", url: "https://stripe.com/atlas/guides/saas-pricing" },
        { title: "The Lean Startup Methodology", url: "https://theleanstartup.com/principles" }
      ],
      successStories: [
        {
          name: "Sarah Johnson",
          background: "Full-stack developer who was frustrated with project management tools",
          journey: "Built a simple, focused tool for freelancers to manage client projects",
          outcome: "Grew to 1,200 paying customers at $15/month within 18 months"
        }
      ],
      roiScore: 70
    });
  }

  /**
   * Add marketing-focused opportunities
   */
  private addMarketingOpportunities(opportunities: RawOpportunity[]): void {
    // Add some generic marketing opportunities
    opportunities.push({
      id: `supplementary-marketing-${Date.now()}`,
      title: "Social Media Management Service",
      description: "Offer comprehensive social media management services for small businesses who struggle with maintaining their online presence. Package your services with content creation, scheduling, and analytics.",
      source: "supplementary",
      type: OpportunityType.SERVICE,
      requiredSkills: ["social media marketing", "content creation", "communication"],
      niceToHaveSkills: ["graphic design", "copywriting", "analytics"],
      estimatedIncome: { min: 1500, max: 5000, timeframe: "month" },
      startupCost: { min: 0, max: 500 },
      timeRequired: { min: 15, max: 30 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: "HIGH",
      stepsToStart: [
        "Define your service packages and pricing",
        "Create a professional portfolio website showcasing your expertise",
        "Develop sample content and case studies (even if hypothetical)",
        "Reach out to small businesses in your network",
        "Offer a discounted rate for first 3 clients to build portfolio"
      ],
      resources: [
        { title: "Social Media Management Tools", url: "https://buffer.com" },
        { title: "Freelance Contract Templates", url: "https://www.and.co/freelance-resources" }
      ],
      successStories: [
        {
          name: "Alex Rivera",
          background: "Marketing coordinator who wanted more flexibility",
          journey: "Started managing social media for two local businesses as a side hustle",
          outcome: "Now has an agency with 15 clients and 3 subcontractors"
        }
      ],
      roiScore: 80
    });
  }

  /**
   * Add teaching-focused opportunities
   */
  private addTeachingOpportunities(opportunities: RawOpportunity[]): void {
    // Add some generic teaching opportunities
    opportunities.push({
      id: `supplementary-teaching-${Date.now()}`,
      title: "Create an Online Course on Your Expertise",
      description: "Package your knowledge into a comprehensive online course that solves specific problems for your target audience. Sell through platforms like Teachable, Podia, or your own website.",
      source: "supplementary",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ["teaching", "subject expertise", "content creation"],
      niceToHaveSkills: ["video production", "marketing", "community building"],
      estimatedIncome: { min: 1000, max: 10000, timeframe: "month" },
      startupCost: { min: 100, max: 1000 },
      timeRequired: { min: 10, max: 30 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: "HIGH",
      stepsToStart: [
        "Validate your course idea through audience research",
        "Create a detailed course outline and learning objectives",
        "Set up an account on a course platform like Teachable",
        "Record and edit your course content",
        "Create supplemental materials and workbooks",
        "Set up sales page and launch marketing"
      ],
      resources: [
        { title: "Teachable Platform", url: "https://teachable.com" },
        { title: "Course Creation Guide", url: "https://convertkit.com/create-and-sell-online-course" }
      ],
      successStories: [
        {
          name: "David Wilson",
          background: "Software engineer with expertise in React",
          journey: "Created a comprehensive course teaching React to beginners",
          outcome: "Earns $5,500/month from course sales with minimal ongoing work"
        }
      ],
      roiScore: 85
    });
  }

  /**
   * Add general opportunities that apply to most skill sets
   */
  private addGeneralOpportunities(opportunities: RawOpportunity[]): void {
    // Add general opportunities that could work for almost anyone
    opportunities.push({
      id: `supplementary-general-${Date.now()}`,
      title: "Start a Productized Service Business",
      description: "Convert your skills into a 'productized service' - a standardized service with fixed scope, deliverables and pricing. This model scales better than custom freelancing.",
      source: "supplementary",
      type: OpportunityType.SERVICE,
      requiredSkills: ["time management", "customer service", "project management"],
      niceToHaveSkills: ["marketing", "sales", "business operations"],
      estimatedIncome: { min: 2000, max: 10000, timeframe: "month" },
      startupCost: { min: 100, max: 1000 },
      timeRequired: { min: 15, max: 40 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: "MEDIUM",
      stepsToStart: [
        "Identify a specific service you can standardize",
        "Create packages with clear deliverables and prices",
        "Build a simple website to showcase your offers",
        "Create a streamlined fulfillment process",
        "Start marketing to your target audience"
      ],
      resources: [
        { title: "Productized Services Guide", url: "https://productizeandscale.com/guide" },
        { title: "Service Business Examples", url: "https://trends.co/productized-services" }
      ],
      successStories: [
        {
          name: "Jamie Rodriguez",
          background: "Freelance designer who was tired of custom project negotiations",
          journey: "Created a logo design service with fixed packages and turnaround times",
          outcome: "Scaled to $12,000/month and hired two designers to help fulfill orders"
        }
      ],
      roiScore: 75
    });
  }

  /**
   * Check if user has skills in a particular category
   */
  private hasSkillsInCategory(
    userSkills: string[],
    categoryKeywords: string[],
  ): boolean {
    // Normalize user skills
    const normalizedSkills = userSkills.map((s) => s.toLowerCase().trim());

    // Check if any user skill contains any category keyword
    for (const skill of normalizedSkills) {
      for (const keyword of categoryKeywords) {
        if (skill.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get the opportunity type as a string
   */
  private getOpportunityType(opportunity: RawOpportunity): string {
    if (!opportunity.type) return OpportunityType.FREELANCE;

    // Handle both string and enum types
    if (typeof opportunity.type === "string") {
      return opportunity.type.toUpperCase();
    }

    return opportunity.type;
  }

  /**
   * Extract opportunity type from keywords
   */
  private inferOpportunityTypeFromKeyword(keyword: string): OpportunityType {
    if (keyword.includes("freelance") || keyword.includes("consult")) {
      return OpportunityType.FREELANCE;
    } else if (
      keyword.includes("product") ||
      keyword.includes("download") ||
      keyword.includes("app")
    ) {
      return OpportunityType.DIGITAL_PRODUCT;
    } else if (
      keyword.includes("content") ||
      keyword.includes("write") ||
      keyword.includes("blog")
    ) {
      return OpportunityType.CONTENT;
    } else if (keyword.includes("service") || keyword.includes("coach")) {
      return OpportunityType.SERVICE;
    } else if (keyword.includes("passive") || keyword.includes("royalty")) {
      return OpportunityType.PASSIVE;
    } else if (keyword.includes("course") || keyword.includes("teach")) {
      return OpportunityType.INFO_PRODUCT;
    }

    // Default to FREELANCE if no match
    return OpportunityType.FREELANCE;
  }

  /**
   * Helper to capitalize first letter of a string
   */
  private capitalizeFirstLetter(text: string): string {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  
  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): Record<string, PerformanceMetrics> {
    return this.performanceMetrics;
  }
  
  /**
   * Get a specific opportunity by ID
   */
  async getOpportunityById(
    id: string,
  ): Promise<RawOpportunity | null> {
    // First check our cache
    if (this.opportunityCache.has(id)) {
      return this.opportunityCache.get(id) || null;
    }

    logger.info(`Opportunity ${id} not found in cache, searching sources`);

    // Look through all sources for this opportunity
    for (const [sourceId, source] of this.sources.entries()) {
      try {
        // Check if the source has a getOpportunityById method
        if (typeof source.getOpportunityById === 'function') {
          // Source has direct ID lookup capability
          const opportunity = await Promise.race([
            source.getOpportunityById(id),
            new Promise<RawOpportunity | null>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Source ${sourceId} lookup timed out`)),
                this.sourceTimeout,
              ),
            ),
          ]);

          if (opportunity) {
            // Cache for future use
            this.opportunityCache.set(id, opportunity);
            return opportunity;
          }
        } else {
          // Try fetching all opportunities from the source
          const opportunities = await this.getOpportunitiesFromSource(sourceId, 50);
          // Find the one with matching ID
          const opportunity = opportunities.find(o => o.id === id);
          if (opportunity) {
            // Cache for future use
            this.opportunityCache.set(id, opportunity);
            return opportunity;
          }
        }
      } catch (error) {
        logger.error(
          `Error looking up opportunity ${id} from source ${sourceId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue to the next source
      }
    }

    // If we reach here, the opportunity wasn't found in any source
    logger.warn(`Opportunity ${id} not found in any source`);
    return null;
  }
}

// Create singleton instance
export const enhancedDiscoveryService = new EnhancedDiscoveryService();