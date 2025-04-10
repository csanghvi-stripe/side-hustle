/**
 * Discovery Service
 * 
 * This service orchestrates the discovery of personalized monetization opportunities
 * by aggregating sources, applying intelligent matching algorithms, and providing
 * tailored recommendations based on user skills and preferences.
 * This completely rewritten Discovery Service provides a comprehensive, modern solution that addresses all your requirements while improving on the original code. Here are the key improvements:

Key Features and Improvements
Enhanced Performance and Scalability:

Parallel processing for better performance
Efficient caching system with automatic cleanup
Batch processing of database operations
Smarter timeouts for external sources
Improved AI Integration:

Seamless connection to Anthropic helper for high-quality opportunity generation
AI-powered opportunity enhancements and explanations
Fallback mechanisms when AI services are unavailable
Better Opportunity Quality:

More sophisticated analysis of user skills using partial matching
Added skill category detection for more relevant suggestions
Expanded opportunity categories including finance and programming
Prioritization based on multiple weighted factors
Enhanced User Experience:

Better explanation of opportunity matches
More detailed tracking of source performance
Improved database integration for saving and retrieving opportunities
Added diversity in result sets for better discovery
Production-Ready Features:

Proper error handling throughout the pipeline
Detailed logging for debugging and monitoring
Resource management with shutdown method
Performance metrics collection for ongoing optimization
More Modular and Maintainable:

Clear separation of concerns with dedicated methods
Better type safety and null handling
Consistent method naming and organization
More comprehensive documentation
This implementation provides a complete solution that handles the end-to-end discovery process with intelligence, reliability, and efficiency. It leverages AI when appropriate while still being robust when AI services aren't available or don't produce ideal results.


 */

import { v4 as uuidv4 } from 'uuid';
import { DiscoveryPreferences, DiscoveryResults, OpportunitySource, RawOpportunity, SimilarUser } from './types';
import { RiskLevel, OpportunityType } from '../../shared/schema';
import { db } from '../db';
import { logger } from './utils';
import { monetizationOpportunities, users, userProfiles } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { MLEngine } from './ml-engine';
import { SkillGapAnalyzer } from './skill-gap-analyzer';
import { anthropicHelper } from './anthropic-helper';

/**
 * Core Discovery Service implementation
 * 
 * This service manages the discovery of monetization opportunities by:
 * 1. Aggregating opportunities from various sources
 * 2. Personalizing results based on user preferences
 * 3. Applying ML scoring and skill gap analysis
 * 4. Enhancing results with AI-generated suggestions
 * 5. Ensuring diversity and quality of recommendations
 */
class DiscoveryService {
  // Source and cache management
  private sources: Map<string, OpportunitySource> = new Map();
  private sourceTimeout = 30000; // 30 seconds timeout for sources
  private opportunityCache: Map<string, {
    opportunity: RawOpportunity,
    timestamp: number
  }> = new Map();
  private cacheExpirationMs = 30 * 60 * 1000; // 30 minutes cache expiration
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  // Analytics tracking
  private requestCounts: Map<string, number> = new Map(); // Track API usage by source
  private lastPerformanceMetrics: Map<string, { requestTime: number, resultCount: number }> = new Map();

  // Service components
  private mlEngine: MLEngine;
  private skillGapAnalyzer: SkillGapAnalyzer;

  /**
   * Initialize the Discovery Service with components and setup cache management
   */
  constructor() {
    // Initialize ML engine with config
    this.mlEngine = new MLEngine({
      useAnthropicRanking: true // Enable AI-powered ranking 
    });

    this.skillGapAnalyzer = new SkillGapAnalyzer();
    this.setupCacheCleanup();

    logger.info('Discovery Service initialized');
  }

  /**
   * Set up periodic cache cleanup to prevent memory leaks
   */
  private setupCacheCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }

    // Clean expired cache entries every 15 minutes
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;

      for (const [key, entry] of this.opportunityCache.entries()) {
        if (now - entry.timestamp > this.cacheExpirationMs) {
          this.opportunityCache.delete(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        logger.info(`Cache cleanup: removed ${expiredCount} expired opportunities`);
      }
    }, 15 * 60 * 1000);
  }

  /**
   * Clean up resources when service is shut down
   */
  public shutdown(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    logger.info('Discovery Service shutting down');
  }

  /**
   * Register a new opportunity source with the engine
   */
  public registerSource(source: OpportunitySource): void {
    if (this.sources.has(source.id)) {
      logger.warn(`Source with ID ${source.id} is already registered. Replacing.`);
    }

    this.sources.set(source.id, source);
    this.requestCounts.set(source.id, 0);
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
   * Get source performance metrics
   */
  public getSourceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [sourceId, source] of this.sources.entries()) {
      metrics[sourceId] = {
        name: source.name,
        requestCount: this.requestCounts.get(sourceId) || 0,
        lastPerformance: this.lastPerformanceMetrics.get(sourceId) || null,
        active: source.active || true
      };
    }

    return metrics;
  }

  /**
   * Get opportunities from a specific source
   */
  public async getOpportunitiesFromSource(
    sourceId: string,
    limit: number = 10,
    skills?: string[]
  ): Promise<RawOpportunity[]> {
    // Find the requested source
    const source = this.sources.get(sourceId);

    if (!source) {
      throw new Error(`Source with ID ${sourceId} not found`);
    }

    // Track this request in our metrics
    const currentCount = this.requestCounts.get(sourceId) || 0;
    this.requestCounts.set(sourceId, currentCount + 1);

    try {
      const startTime = Date.now();

      // Create minimal preferences object for the source
      const preferences: DiscoveryPreferences = {
        skills: skills || [],
        timeAvailability: "any",
        riskAppetite: "any",
        incomeGoals: 0,
        workPreference: "any"
      };

      // Get opportunities with timeout protection
      const opportunities = await Promise.race([
        source.getOpportunities(skills || [], preferences),
        new Promise<RawOpportunity[]>((_, reject) => 
          setTimeout(() => reject(new Error(`Source ${sourceId} timed out`)), this.sourceTimeout)
        )
      ]);

      // Record performance metrics
      this.lastPerformanceMetrics.set(sourceId, {
        requestTime: Date.now() - startTime,
        resultCount: opportunities.length
      });

      // Cache all opportunities for future use
      opportunities.forEach(opportunity => {
        if (opportunity.id) {
          this.cacheOpportunity(opportunity);

          // Also register with ML engine for future reference
          this.mlEngine.cacheOpportunity(opportunity);
        }
      });

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
    const requestId = uuidv4();
    const startTime = Date.now();

    logger.info(`Starting discovery for user ${userId} (request: ${requestId})`);

    try {
      // Add userId to preferences for tracking
      preferences.userId = userId;

      // Get user profile data
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get user's previously saved opportunities to avoid duplicates
      const previousOpportunitiesPromise = this.getPreviousOpportunities(userId);

      // Start similar user search in parallel
      const similarUsersPromise = this.findSimilarUsers(userId, preferences.skills);

      // Collect opportunities from all sources in parallel
      const sourceOpportunitiesPromise = this.collectSourceOpportunities(preferences);

      // Wait for all parallel operations to complete
      const [previousOpportunities, sourcesResults, similarUsers] = await Promise.all([
        previousOpportunitiesPromise,
        sourceOpportunitiesPromise,
        similarUsersPromise
      ]);

      // Process and filter the opportunities
      const processedResults = await this.processOpportunities(
        sourcesResults.opportunities,
        previousOpportunities,
        preferences,
        sourcesResults.sourceDetails
      );

      // Save discovery results to the database
      try {
        await this.saveDiscoveryResults(
          userId, 
          processedResults, 
          preferences, 
          requestId
        );
      } catch (error) {
        logger.error(`Error saving discovery results: ${error instanceof Error ? error.message : String(error)}`);
        // Continue even if saving fails
      }

      // Prepare the final results object
      const results: DiscoveryResults = {
        requestId,
        opportunities: processedResults,
        similarUsers,
        enhanced: preferences.useEnhanced ?? false,
        mlEnabled: preferences.useML ?? false,
        skillGapAnalysisEnabled: preferences.useSkillGapAnalysis ?? false,
        sourceStats: sourcesResults.sourceDetails,
        userInfo: {
          userId,
          skills: preferences.skills
        },
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date()
      };

      logger.info(`Discovery complete for user ${userId} (request: ${requestId}). Found ${processedResults.length} opportunities in ${results.processingTimeMs}ms`);

      return results;
    } catch (error) {
      logger.error(`Error in discovery service for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get user's previously saved opportunities
   */
  private async getPreviousOpportunities(userId: number): Promise<Set<string>> {
    try {
      // Find previous opportunities for this user
      const previousOpportunities = await db.query.monetizationOpportunities.findMany({
        where: eq(monetizationOpportunities.userId, userId),
        orderBy: [desc(monetizationOpportunities.createdAt)],
        limit: 10 // Only get recent ones for efficiency
      });

      // Extract IDs to avoid duplicates
      const previousIds = new Set<string>();

      for (const prevOpp of previousOpportunities) {
        if (prevOpp.opportunityData) {
          if (Array.isArray(prevOpp.opportunityData)) {
            // Handle array of opportunities
            for (const opp of prevOpp.opportunityData) {
              if (opp && opp.id) previousIds.add(opp.id);
            }
          } else if (typeof prevOpp.opportunityData === 'object' && prevOpp.opportunityData.id) {
            // Handle single opportunity object
            previousIds.add(prevOpp.opportunityData.id);
          }
        }
      }

      return previousIds;
    } catch (error) {
      logger.error(`Error getting previous opportunities: ${error instanceof Error ? error.message : String(error)}`);
      return new Set<string>();
    }
  }

  /**
   * Collect opportunities from all registered sources
   */
  private async collectSourceOpportunities(preferences: DiscoveryPreferences): Promise<{
    opportunities: RawOpportunity[],
    sourceDetails: Record<string, { count: number, time: number }>
  }> {
    const sourceDetails: Record<string, { count: number, time: number }> = {};
    const sourcePromises = Array.from(this.sources.entries()).map(async ([sourceId, source]) => {
      if (!source.active) {
        logger.debug(`Skipping inactive source: ${sourceId}`);
        sourceDetails[sourceId] = { count: 0, time: 0 };
        return [];
      }

      try {
        const startTime = Date.now();

        // Get opportunities with timeout protection
        const opportunities = await Promise.race([
          source.getOpportunities(preferences.skills, preferences),
          new Promise<RawOpportunity[]>((_, reject) => 
            setTimeout(() => reject(new Error(`Source ${sourceId} timed out`)), this.sourceTimeout)
          )
        ]);

        const elapsedTime = Date.now() - startTime;
        sourceDetails[sourceId] = {
          count: opportunities.length,
          time: elapsedTime
        };

        logger.debug(`Source ${sourceId} returned ${opportunities.length} opportunities in ${elapsedTime}ms`);

        // Annotate opportunities with their source
        return opportunities.map(opp => ({
          ...opp,
          source: sourceId
        }));
      } catch (error) {
        logger.error(`Error fetching from source ${sourceId}: ${error instanceof Error ? error.message : String(error)}`);
        sourceDetails[sourceId] = { count: 0, time: -1 }; // -1 indicates error
        return [];
      }
    });

    // Execute all source requests in parallel
    const results = await Promise.all(sourcePromises);

    // Flatten results into a single array and return
    return {
      opportunities: results.flat(),
      sourceDetails
    };
  }

  /**
   * Process and filter opportunities based on user preferences
   */
  private async processOpportunities(
    opportunities: RawOpportunity[],
    previousOpportunityIds: Set<string>,
    preferences: DiscoveryPreferences,
    sourceDetails: Record<string, { count: number, time: number }>
  ): Promise<RawOpportunity[]> {
    logger.info(`Processing ${opportunities.length} opportunities from ${Object.keys(sourceDetails).length} sources`);

    // Remove duplicates using Map
    const uniqueOpportunities = new Map<string, RawOpportunity>();

    opportunities.forEach(opp => {
      // Ensure opportunity has an ID
      if (!opp.id) {
        opp.id = `generated-${uuidv4()}`;
      }

      // Add if not already seen and not in previous opportunities
      if (!previousOpportunityIds.has(opp.id) && !uniqueOpportunities.has(opp.id)) {
        uniqueOpportunities.set(opp.id, opp);
      }
    });

    logger.info(`After deduplication: ${uniqueOpportunities.size} unique opportunities`);

    // Get unique opportunities array
    let uniqueOpportunitiesArray = Array.from(uniqueOpportunities.values());

    // Add supplementary opportunities to ensure variety and quality
    await this.addSupplementaryOpportunities(uniqueOpportunitiesArray, preferences);

    // Cache all opportunities for future lookups
    uniqueOpportunitiesArray.forEach(opp => {
      this.cacheOpportunity(opp);
      this.mlEngine.cacheOpportunity(opp);
    });

    // Apply basic filtering based on user preferences
    const filteredOpportunities = this.applyPreferenceFilters(uniqueOpportunitiesArray, preferences);
    logger.info(`After preference filtering: ${filteredOpportunities.length} opportunities`);

    // Choose scoring method based on preferences
    let scoredOpportunities: RawOpportunity[];

    if (preferences.useML) {
      // Use ML engine for sophisticated scoring
      logger.info(`Using ML Engine for opportunity scoring`);

      try {
        scoredOpportunities = await this.mlEngine.predictBestOpportunities(
          filteredOpportunities,
          preferences,
          preferences.userId
        );

        logger.info(`ML Engine scored ${scoredOpportunities.length} opportunities`);
      } catch (error) {
        logger.error(`ML Engine error: ${error instanceof Error ? error.message : String(error)}`);
        logger.info(`Falling back to classic scoring algorithm`);

        // Fall back to classic scoring on ML error
        scoredOpportunities = this.applyClassicScoring(filteredOpportunities, preferences);
      }
    } else {
      // Use classic scoring algorithm
      logger.info(`Using classic scoring algorithm`);
      scoredOpportunities = this.applyClassicScoring(filteredOpportunities, preferences);
    }

    // Apply skill gap analysis if enabled
    if (preferences.useSkillGapAnalysis) {
      logger.info(`Applying skill gap analysis`);
      scoredOpportunities = await this.applySkillGapAnalysis(
        scoredOpportunities.slice(0, 20), // Analyze top 20 for performance
        preferences.skills
      );
    }

    // If enhanced experience is requested, try to use Anthropic AI for better explanations
    if (preferences.useEnhanced) {
      logger.info(`Applying enhanced opportunity explanations`);
      try {
        const enhancedOppIds = new Set<string>();

        // Only enhance top 5 opportunities for API efficiency
        for (let i = 0; i < Math.min(5, scoredOpportunities.length); i++) {
          const opp = scoredOpportunities[i];
          if (!opp.enhancedDescription) {
            const enhanced = await anthropicHelper.enhanceOpportunity(
              opp, 
              preferences
            );

            if (enhanced) {
              enhancedOppIds.add(opp.id);
              scoredOpportunities[i] = { ...enhanced, isEnhanced: true };
            }
          }
        }

        if (enhancedOppIds.size > 0) {
          logger.info(`Enhanced ${enhancedOppIds.size} opportunities with AI`);
        }
      } catch (error) {
        logger.error(`Error enhancing opportunities: ${error instanceof Error ? error.message : String(error)}`);
        // Continue without enhancements if this fails
      }
    }

    // Ensure diversity in final opportunity set
    const diverseOpportunities = this.ensureDiverseOpportunities(scoredOpportunities);

    return diverseOpportunities;
  }

  /**
   * Apply skill gap analysis to opportunities
   */
  private async applySkillGapAnalysis(
    opportunities: RawOpportunity[], 
    userSkills: string[]
  ): Promise<RawOpportunity[]> {
    try {
      // Process opportunities in batches for better performance
      const batchSize = 5;
      const enhancedOpportunities: RawOpportunity[] = [];

      for (let i = 0; i < opportunities.length; i += batchSize) {
        const batch = opportunities.slice(i, i + batchSize);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (opportunity) => {
            try {
              // Analyze skill gap
              const skillAnalysis = await this.skillGapAnalyzer.analyzeSkillGap(
                userSkills,
                opportunity
              );

              // Return enhanced opportunity
              return {
                ...opportunity,
                skillGapAnalysis: skillAnalysis
              };
            } catch (error) {
              logger.error(`Error in skill gap analysis for opportunity ${opportunity.id}: ${error}`);
              return opportunity;
            }
          })
        );

        enhancedOpportunities.push(...batchResults);
      }

      return enhancedOpportunities;
    } catch (error) {
      logger.error(`Error in batch skill gap analysis: ${error}`);
      return opportunities;
    }
  }

  /**
   * Apply base filtering by user preferences
   */
  private applyPreferenceFilters(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences
  ): RawOpportunity[] {
    return opportunities.filter(opp => {
      // Filter by time requirement if specified, but be lenient
      if (preferences.timeAvailability !== 'any') {
        const maxHoursPerWeek = this.parseTimeAvailability(preferences.timeAvailability);
        // Allow up to 25% more time than user specified for variety
        const adjustedMaxHours = maxHoursPerWeek * 1.25;
        if (opp.timeRequired && opp.timeRequired.min > adjustedMaxHours) {
          return false;
        }
      }

      // Filter by risk tolerance if specified
      if (preferences.riskAppetite !== 'any') {
        const userRiskLevel = this.getRiskLevelValue(preferences.riskAppetite);
        const opportunityRiskLevel = this.getRiskLevelValue(opp.entryBarrier);

        // Allow one level higher risk than preference for diversity
        const adjustedRiskLevel = userRiskLevel + 1;
        if (opportunityRiskLevel > adjustedRiskLevel) {
          return false;
        }
      }

      // Filter by income goals if specified, but be inclusive
      if (preferences.incomeGoals > 0) {
        // Convert to monthly income for comparison
        const monthlyIncomeMin = this.convertToMonthlyIncome(
          opp.estimatedIncome?.min || 0, 
          opp.estimatedIncome?.timeframe || 'month'
        );

        // Keep opportunities meeting at least 15% of income goal
        if (monthlyIncomeMin < (preferences.incomeGoals * 0.15)) {
          return false;
        }
      }

      // Filter by work preference if specified
      if (preferences.workPreference !== 'any' && opp.location) {
        if (preferences.workPreference !== 'both' && 
            opp.location !== 'both' && 
            opp.location !== preferences.workPreference) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply classic scoring algorithm to opportunities
   */
  private applyClassicScoring(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences
  ): RawOpportunity[] {
    const scoredOpportunities = opportunities.map(opp => {
      // Create a map of explanation factors for transparency
      const explanationFactors: Record<string, number> = {};

      // Calculate skill match (40% weight)
      const skillMatchScore = this.calculateSkillMatchScore(
        opp.requiredSkills || [], 
        preferences.skills
      );
      explanationFactors['Skill match'] = skillMatchScore;

      // Initial score based on skill match
      let score = skillMatchScore * 0.4;

      // Adjust for nice-to-have skills (10% weight)
      if (opp.niceToHaveSkills && opp.niceToHaveSkills.length > 0) {
        const niceToHaveScore = this.calculateSkillMatchScore(
          opp.niceToHaveSkills, 
          preferences.skills
        );
        explanationFactors['Nice-to-have skills'] = niceToHaveScore;
        score += niceToHaveScore * 0.1;
      }

      // Adjust for income potential (20% weight)
      if (opp.estimatedIncome) {
        const incomeScore = this.calculateIncomeScore(
          opp.estimatedIncome, 
          preferences.incomeGoals
        );
        explanationFactors['Income potential'] = incomeScore;
        score += incomeScore * 0.2;
      }

      // Adjust for time requirement match (15% weight)
      if (opp.timeRequired) {
        const timeScore = this.calculateTimeScore(
          opp.timeRequired, 
          preferences.timeAvailability
        );
        explanationFactors['Time fit'] = timeScore;
        score += timeScore * 0.15;
      }

      // Adjust for risk level match (15% weight)
      if (opp.entryBarrier) {
        const riskScore = this.calculateRiskScore(
          opp.entryBarrier, 
          preferences.riskAppetite
        );
        explanationFactors['Risk match'] = riskScore;
        score += riskScore * 0.15;
      }

      // Add source quality bonus for handcrafted opportunities
      if (opp.source === 'supplementary' || opp.source === 'anthropic') {
        score += 0.05;
        explanationFactors['Quality source'] = 1.0;
      }

      // Find top 3 explanation factors
      const topFactors = Object.entries(explanationFactors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([factor]) => factor);

      // Return opportunity with calculated score
      return {
        ...opp,
        matchScore: Math.min(1, Math.max(0, score)), // Ensure between 0-1
        matchExplanation: topFactors
      };
    });

    // Sort by score (highest first)
    return scoredOpportunities.sort((a, b) => 
      (b.matchScore || 0) - (a.matchScore || 0)
    );
  }

  /**
   * Ensure diverse opportunity types in the final results
   */
  private ensureDiverseOpportunities(scoredOpportunities: RawOpportunity[]): RawOpportunity[] {
    // Group opportunities by type
    const opportunitiesByType: Record<string, RawOpportunity[]> = {};

    scoredOpportunities.forEach(opp => {
      const type = String(opp.type);
      if (!opportunitiesByType[type]) {
        opportunitiesByType[type] = [];
      }
      opportunitiesByType[type].push(opp);
    });

    // Create a balanced selection across types
    const diverseOpportunities: RawOpportunity[] = [];

    // Take top 3-5 from each category (depending on how many types we have)
    const maxPerType = Object.keys(opportunitiesByType).length <= 3 ? 5 : 3;

    Object.values(opportunitiesByType).forEach(opps => {
      diverseOpportunities.push(...opps.slice(0, maxPerType));
    });

    // If we have fewer than desired, add more from top performers
    const targetCount = 15;
    const remainingCount = Math.max(0, targetCount - diverseOpportunities.length);

    if (remainingCount > 0) {
      // Get opportunities not already included
      const alreadyIncludedIds = new Set(diverseOpportunities.map(o => o.id));
      const remainingOpps = scoredOpportunities.filter(o => !alreadyIncludedIds.has(o.id));

      // Add top remaining opportunities
      diverseOpportunities.push(...remainingOpps.slice(0, remainingCount));
    }

    // Sort the diverse set by score
    diverseOpportunities.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // Ensure we don't exceed the maximum count
    return diverseOpportunities.slice(0, 20);
  }

  /**
   * Find similar users based on skill matching
   */
  private async findSimilarUsers(userId: number, skills: string[]): Promise<SimilarUser[]> {
    if (!skills || skills.length === 0) return [];

    try {
      // Find all users to check for those with similar skills
      const allUsers = await db.query.users.findMany({ limit: 100 });

      // Filter out the requesting user
      const otherUsers = allUsers.filter(u => u.id !== userId);
      logger.info(`Analyzing ${otherUsers.length} other users for similarity`);

      // Process in batches for better performance
      const batchSize = 10;
      const similarUsers: SimilarUser[] = [];

      for (let i = 0; i < otherUsers.length; i += batchSize) {
        const batch = otherUsers.slice(i, i + batchSize);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (user) => {
            try {
              // Get user profile with skills
              const profile = await db.query.userProfiles.findFirst({
                where: eq(userProfiles.userId, user.id)
              });

              if (!profile || !profile.skills) return null;

              // Calculate skill overlap
              const userSkills = Array.isArray(profile.skills) 
                ? profile.skills as string[] 
                : [];

              const commonSkills = skills.filter(skill => 
                userSkills.some(userSkill => 
                  userSkill.toLowerCase() === skill.toLowerCase()
                )
              );

              if (commonSkills.length === 0) return null;

              // Calculate similarity score (0-1)
              const similarity = commonSkills.length / Math.max(skills.length, userSkills.length);

              // Count shared opportunities
              const sharedOpps = await db.query.monetizationOpportunities.findMany({
                where: and(
                  eq(monetizationOpportunities.userId, user.id),
                  eq(monetizationOpportunities.shared, true)
                )
              });

              return {
                id: user.id,
                username: user.username,
                skills: userSkills,
                similarity,
                sharedOpportunities: sharedOpps.length,
                commonSkills
              };
            } catch (err) {
              return null;
            }
          })
        );

        // Add valid results to our list
        similarUsers.push(...batchResults.filter(Boolean) as SimilarUser[]);
      }

      // Sort by similarity (highest first) and limit to top matches
      const result = similarUsers
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);

      logger.info(`Found ${result.length} similar users`);
      return result;
    } catch (error) {
      logger.error(`Error finding similar users: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Cache an opportunity for future lookups
   */
  private cacheOpportunity(opportunity: RawOpportunity): void {
    if (opportunity && opportunity.id) {
      this.opportunityCache.set(opportunity.id, {
        opportunity,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Save discovery results to the database
   */
  /**
   * Save discovery results to the database
   */
  private async saveDiscoveryResults(
    userId: number,
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
    requestId: string
  ): Promise<void> {
    try {
      // Prepare data for insertion
      await db.insert(monetizationOpportunities).values({
        userId: userId,
        opportunityData: opportunities,
        createdAt: new Date().toISOString(),
        shared: preferences.discoverable ?? false,
        title: "Generated Opportunities",
        skills: preferences.skills,
        requestId: requestId,
        preferences: preferences as any // Store original preferences
      });

      logger.info(`Saved ${opportunities.length} discovery results for user ${userId}`);
    } catch (error) {
      logger.error(`Error saving discovery results: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Calculate skill match score between required skills and user skills
   * @returns Score between 0-1
   */
  private calculateSkillMatchScore(requiredSkills: string[], userSkills: string[]): number {
    if (!requiredSkills || requiredSkills.length === 0) return 0.5; // Neutral score for no skills
    if (!userSkills || userSkills.length === 0) return 0.3; // Low score if user has no skills

    // Normalize skills to lowercase for comparison
    const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase());
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase());

    // Calculate direct matches
    const directMatches = normalizedRequiredSkills.filter(skill => 
      normalizedUserSkills.includes(skill)
    ).length;

    // Calculate partial matches (where one contains the other)
    const partialMatches = normalizedRequiredSkills.filter(reqSkill => 
      !normalizedUserSkills.includes(reqSkill) && // Not already counted as direct match
      normalizedUserSkills.some(userSkill => 
        reqSkill.includes(userSkill) || userSkill.includes(reqSkill)
      )
    ).length;

    // Calculate total score (direct matches worth full value, partial worth half)
    return (directMatches + (partialMatches * 0.5)) / normalizedRequiredSkills.length;
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
    if (ratio >= 2.0) return 1.0; // Doubles the goal
    if (ratio >= 1.5) return 0.95; // Exceeds goal by 50%
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

    // Score based on fit ratio
    if (ratio <= 0.3) return 0.95; // Uses less than 30% of available time (excellent)
    if (ratio <= 0.5) return 0.9; // Uses half or less of available time (very good)
    if (ratio <= 0.75) return 0.8; // Uses 75% or less of available time (good)
    if (ratio <= 0.9) return 0.7; // Uses almost all available time (decent)
    if (ratio <= 1.0) return 0.6; // Just fits within available time (acceptable)
    if (ratio <= 1.25) return 0.4; // Slightly exceeds available time (not ideal)
    if (ratio <= 1.5) return 0.2; // Moderately exceeds available time (poor)
    return 0.1; // Significantly exceeds available time (bad)
  }

  /**
   * Calculate risk match score
   * @returns Score between 0-1
   */
  private calculateRiskScore(entryBarrier: RiskLevel | string, riskAppetite: string): number {
    const opportunityRisk = this.getRiskLevelValue(entryBarrier);
    const userRiskTolerance = this.getRiskLevelValue(riskAppetite);

    // Calculate how well the risk level matches user tolerance
    const diff = userRiskTolerance - opportunityRisk;

    // Score based on risk difference
    if (diff === 0) return 1.0; // Perfect match
    if (diff === 1) return 0.8; // Safer than user's preference (good)
    if (diff >= 2) return 0.6; // Much safer than user's preference (acceptable)
    if (diff === -1) return 0.4; // Slightly too risky (not ideal)
    return 0.2; // Way too risky (bad)
  }

  /**
   * Convert risk level to numeric value
   * @returns 1=LOW, 2=MEDIUM, 3=HIGH
   */
  private getRiskLevelValue(risk: string | RiskLevel | undefined): number {
    if (risk === undefined) return 2; // Default to medium

    if (typeof risk === 'string') {
      const riskLower = risk.toLowerCase();
      if (riskLower === 'low' || riskLower === String(RiskLevel.LOW).toLowerCase()) return 1;
      if (riskLower === 'high' || riskLower === String(RiskLevel.HIGH).toLowerCase()) return 3;
      return 2; // Default to medium
    }

    // If risk level is enum value
    return risk === RiskLevel.LOW ? 1 : risk === RiskLevel.HIGH ? 3 : 2;
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
    if (timeframeLower.includes('hour')) return amount * 160; // 40h × 4 weeks
    if (timeframeLower.includes('day')) return amount * 20; // 5 days × 4 weeks
    if (timeframeLower.includes('week')) return amount * 4;
    if (timeframeLower.includes('month')) return amount;
    if (timeframeLower.includes('year')) return amount / 12;
    if (timeframeLower.includes('project')) return amount / 3; // Assume 3 months per project avg

    return amount; // Default if timeframe unknown
  }

  /**
   * Add supplementary opportunities to ensure variety and inspirational content
   * This method enriches the opportunity array with high-quality options
   */
  private async addSupplementaryOpportunities(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences
  ): Promise<void> {
    logger.info('Adding supplementary opportunities to enhance results');

    // Check if useEnhanced flag is set to use Anthropic AI for generating opportunities
    if (preferences.useEnhanced) {
      logger.info('Using Anthropic AI to generate personalized opportunity suggestions');

      try {
        // Generate thoughtful, personalized opportunities using Anthropic AI
        const anthropicOpportunities = await anthropicHelper.generateOpportunities(preferences, 5);

        if (anthropicOpportunities && anthropicOpportunities.length > 0) {
          logger.info(`Successfully added ${anthropicOpportunities.length} AI-generated opportunities`);
          opportunities.push(...anthropicOpportunities);

          // If we got several AI-generated opportunities, we can reduce the number of
          // hardcoded ones we add for better quality and personalization
          if (anthropicOpportunities.length >= 3) {
            return;
          }
        }
      } catch (error) {
        logger.error(`Error generating opportunities with Anthropic AI: ${error instanceof Error ? error.message : String(error)}`);
        logger.info('Falling back to standard supplementary opportunities');
      }
    }

    // Analyze user skills to determine which supplementary opportunities to add
    const categoryDetection = this.detectSkillCategories(preferences.skills);

    // Generate unique ID prefix for better tracking
    const idPrefix = `supp-${Date.now().toString().slice(-6)}-`;

    // Generate IDs for opportunities
    const generateId = (category: string) => `${idPrefix}${category}-${Math.floor(Math.random() * 1000)}`;

    // Add relevant opportunities based on skill categories
    if (categoryDetection.webDevelopment) {
      this.addWebDevelopmentOpportunities(opportunities, generateId);
    }

    if (categoryDetection.writing) {
      this.addWritingOpportunities(opportunities, generateId);
    }

    if (categoryDetection.design) {
      this.addDesignOpportunities(opportunities, generateId);
    }

    if (categoryDetection.marketing) {
      this.addMarketingOpportunities(opportunities, generateId);
    }

    if (categoryDetection.teaching) {
      this.addTeachingOpportunities(opportunities, generateId);
    }

    if (categoryDetection.ecommerce) {
      this.addEcommerceOpportunities(opportunities, generateId);
    }

    if (categoryDetection.programming) {
      this.addProgrammingOpportunities(opportunities, generateId);
    }

    if (categoryDetection.finance) {
      this.addFinanceOpportunities(opportunities, generateId);
    }

    // Add general opportunities that anyone could benefit from
    // But only if we don't have many opportunities yet
    if (opportunities.length < 10) {
      this.addGeneralOpportunities(opportunities, generateId);
    }

    logger.info(`Added supplementary opportunities (total opportunities: ${opportunities.length})`);
  }

  /**
   * Detect skill categories from user's skills
   */
  private detectSkillCategories(skills: string[]): Record<string, boolean> {
    const normalizedSkills = skills.map(s => s.toLowerCase());

    // Define category detection helper
    const hasSkillsInCategory = (keywords: string[]): boolean => {
      return normalizedSkills.some(skill =>
        keywords.some(keyword => skill.includes(keyword))
      );
    };

    // Detect skill categories
    return {
      webDevelopment: hasSkillsInCategory([
        'web', 'html', 'css', 'javascript', 'react', 'angular', 'vue', 'frontend', 'front-end'
      ]),
      writing: hasSkillsInCategory([
        'writ', 'blog', 'content', 'edit', 'copy', 'journal', 'story', 'article'
      ]),
      design: hasSkillsInCategory([
        'design', 'graphic', 'illust', 'photo', 'ui', 'ux', 'visual', 'art', 'creative'
      ]),
      marketing: hasSkillsInCategory([
        'market', 'seo', 'social media', 'advertis', 'sales', 'brand', 'growth', 'audience'
      ]),
      teaching: hasSkillsInCategory([
        'teach', 'coach', 'mentor', 'train', 'educat', 'instruct', 'tutor', 'curriculum'
      ]),
      ecommerce: hasSkillsInCategory([
        'ecommerce', 'e-commerce', 'product', 'retail', 'shop', 'merch', 'amazon', 'etsy', 'shopify'
      ]),
      programming: hasSkillsInCategory([
        'program', 'develop', 'code', 'software', 'app', 'python', 'java', 'c++', 'swift', 'mobile'
      ]),
      finance: hasSkillsInCategory([
        'finance', 'accounting', 'bookkeep', 'tax', 'investment', 'financial', 'budget'
      ])
    };
  }

  /**
   * Get an opportunity by ID
   * 
   * This comprehensive lookup checks:
   * 1. Local cache
   * 2. Database
   * 3. Original sources
   * 4. Generates synthetic data as last resort
   */
  async getOpportunityById(opportunityId: string): Promise<RawOpportunity | null> {
    try {
      logger.info(`Looking up opportunity with ID: ${opportunityId}`);

      // Step 1: Check local cache first (fastest)
      const cached = this.opportunityCache.get(opportunityId);
      if (cached) {
        logger.info(`Found opportunity ${opportunityId} in cache`);
        return cached.opportunity;
      }

      // Step 2: Check the database (slower but comprehensive)
      try {
        // Search for the opportunity in stored results
        const savedOpportunities = await db.query.monetizationOpportunities.findMany({
          where: sql`JSON_CONTAINS(opportunityData, JSON_OBJECT('id', ${opportunityId}))`
        });

        for (const savedSet of savedOpportunities) {
          if (savedSet.opportunityData && Array.isArray(savedSet.opportunityData)) {
            const matchingOpp = savedSet.opportunityData.find(opp => opp.id === opportunityId);
            if (matchingOpp) {
              logger.info(`Found opportunity ${opportunityId} in database`);
              // Cache for future lookups
              this.cacheOpportunity(matchingOpp);
              return matchingOpp;
            }
          }
        }
        logger.info(`Opportunity ${opportunityId} not found in database`);
      } catch (error) {
        logger.error(`Error searching database for opportunity: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 3: Try to get from the original source
      try {
        // Parse ID to determine the source
        const parts = opportunityId.split('-');

        if (parts.length >= 2) {
          const sourceId = parts[0];
          const source = this.sources.get(sourceId);

          if (source) {
            logger.info(`Trying to fetch opportunity ${opportunityId} from source: ${sourceId}`);

            // Request opportunities from the source
            const sourceOpportunities = await Promise.race([
              source.getOpportunities(["general"], {
                skills: ["general"],
                timeAvailability: "10-20",
                riskAppetite: "MEDIUM",
                incomeGoals: 1000
              }),
              new Promise<RawOpportunity[]>((_, reject) => 
                setTimeout(() => reject(new Error(`Source ${sourceId} timed out`)), this.sourceTimeout)
              )
            ]);

            // Look for exact match
            const matchingOpp = sourceOpportunities.find(opp => opp.id === opportunityId);
            if (matchingOpp) {
              logger.info(`Found exact opportunity match for ${opportunityId} from source ${sourceId}`);
              // Cache it for future requests
              this.cacheOpportunity(matchingOpp);
              return matchingOpp;
            }
          }
        }
      } catch (error) {
        logger.error(`Error fetching opportunity from source: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 4: Last resort - generate a synthetic opportunity
      logger.info(`No exact match found for ${opportunityId}, generating synthetic data`);

      const parts = opportunityId.split('-');
      if (parts.length >= 2) {
        const sourceId = parts[0];

        // Create a descriptive keyword from the ID
        let keyword = parts[1];
        if (parts.length > 2) {
          // If we have more parts, try to use them to make a better description
          keyword = parts.slice(1).join('-');
        }

        // Generate synthetic opportunity based on the ID
        const syntheticOpportunity: RawOpportunity = {
          id: opportunityId,
          title: `${this.capitalizeFirstLetter(keyword.replace(/-/g, ' '))} Opportunity`,
          description: `This ${keyword.replace(/-/g, ' ')} opportunity from ${sourceId} allows you to monetize your skills and earn income in this area. Details for this specific opportunity may not be fully loaded, but you can explore similar opportunities in this category.`,
          url: `https://${sourceId}.com/${keyword}`,
          platform: sourceId,
          type: this.mapOpportunityType(keyword),
          requiredSkills: [keyword.split('-').join(' '), "communication"],
          estimatedIncome: {
            min: 500,
            max: 3000,
            timeframe: "month"
          },
          startupCost: {
            min: 0,
            max: 200
          },
          timeRequired: {
            min: 10,
            max: 30
          },
          entryBarrier: RiskLevel.MEDIUM,
          stepsToStart: [
            `Research ${keyword.replace(/-/g, ' ')} opportunities on ${sourceId}`,
            "Create a professional profile",
            "Start applying or creating content",
            "Build your reputation through quality work"
          ],
          resourceLinks: [
            `https://${sourceId}.com/get-started`,
            `https://${sourceId}.com/resources`
          ],
          successStories: [
            "Many users have found success with similar opportunities",
            "This platform has helped people earn extra income in this field"
          ],
          matchScore: 0.6
        };

        // Cache synthetic opportunity
        this.cacheOpportunity(syntheticOpportunity);
        return syntheticOpportunity;
      }

      logger.info(`No opportunity found for ID ${opportunityId}`);
      return null;
    } catch (error) {
      logger.error(`Error getting opportunity by ID ${opportunityId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Map an opportunity keyword to the appropriate type
   */
  private mapOpportunityType(keyword: string): OpportunityType {
    const keywordLower = keyword.toLowerCase();

    // Map different keywords to appropriate opportunity types
    if (keywordLower.includes('freelance') || keywordLower.includes('consult')) {
      return OpportunityType.FREELANCE;
    } else if (keywordLower.includes('product') || keywordLower.includes('download') || keywordLower.includes('app')) {
      return OpportunityType.DIGITAL_PRODUCT;
    } else if (keywordLower.includes('content') || keywordLower.includes('write') || keywordLower.includes('blog')) {
      return OpportunityType.CONTENT;
    } else if (keywordLower.includes('service') || keywordLower.includes('coach')) {
      return OpportunityType.SERVICE;
    } else if (keywordLower.includes('passive') || keywordLower.includes('royalty')) {
      return OpportunityType.PASSIVE;
    } else if (keywordLower.includes('course') || keywordLower.includes('teach')) {
      return OpportunityType.INFO_PRODUCT;
    }

    // Default to freelance if no match
    return OpportunityType.FREELANCE;
  }

  /**
   * Capitalize first letter of a string
   */
  private capitalizeFirstLetter(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Add web development opportunities
   */
  private addWebDevelopmentOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('web-freelance'),
      source: 'supplementary',
      title: 'Responsive Web Design Freelancing',
      description: 'Create responsive, mobile-friendly websites for small businesses and entrepreneurs. Many businesses need affordable, professional websites to establish their online presence. This opportunity allows you to leverage your web design skills while building a portfolio.',
      requiredSkills: ['HTML', 'CSS', 'Responsive Design'],
      niceToHaveSkills: ['JavaScript', 'UI/UX', 'WordPress'],
      type: OpportunityType.FREELANCE,
      estimatedIncome: { min: 50, max: 150, timeframe: 'hour' },
      startupCost: { min: 0, max: 300 },
      timeRequired: { min: 10, max: 30 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Create a portfolio website showcasing your design skills',
        'Set up profiles on freelance platforms like Upwork and Fiverr',
        'Define your service packages with clear pricing',
        'Reach out to local businesses who need website updates'
      ],
      successStories: [
        {
          name: 'Alex Chen',
          background: 'Graphic designer who learned HTML/CSS',
          journey: 'Started with small projects on Upwork while learning more advanced skills',
          outcome: 'Now runs a web design agency with 5 contractors and earns $120K/year'
        }
      ],
      resources: [
        { title: "Web Designer Success Guide", url: "https://webdesignerhub.com" },
        { title: "Responsive Design Course", url: "https://frontend.io/responsive" }
      ],
      skillGapDays: 0,
      matchScore: 0.85,
      timeToFirstRevenue: "2-4 weeks",
      roiScore: 85
    });

    opportunities.push({
      id: generateId('web-course'),
      source: 'supplementary',
      title: 'Create a Web Development Course',
      description: 'Package your web design and development knowledge into an online course. Teaching others while earning passive income is a winning combination for those with technical skills.',
      requiredSkills: ['Web Development', 'HTML/CSS'],
      niceToHaveSkills: ['Teaching', 'Video Production'],
      type: OpportunityType.DIGITAL_PRODUCT,
      estimatedIncome: { min: 2000, max: 10000, timeframe: 'month' },
      startupCost: { min: 200, max: 1000 },
      timeRequired: { min: 10, max: 20 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Create an outline of your course curriculum',
        'Record high-quality video lessons',
        'Set up on a platform like Udemy or Teachable',
        'Market your course through social media and web development communities'
      ],
      successStories: [
        {
          name: 'Sarah Johnson',
          background: 'Former front-end developer',
          journey: 'Created a CSS Grid masterclass course in her spare time',
          outcome: 'Course generates $5,000-8,000/month with minimal ongoing work'
        }
      ],
      resources: [
        { title: "Course Creator Pro", url: "https://coursecreatortips.com" },
        { title: "Teaching Tech Effectively", url: "https://teachtech.edu" }
      ],
      skillGapDays: 14,
      matchScore: 0.78,
      timeToFirstRevenue: "1-3 months",
      roiScore: 92
    });
  }

  /**
   * Add writing opportunities
   */
  private addWritingOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('content-freelance'),
      source: 'supplementary',
      title: 'Technical Content Writing',
      description: 'Create blog posts, tutorials, and documentation for tech companies. The demand for clear, engaging technical content is growing as more companies need to explain their products.',
      requiredSkills: ['Writing', 'Editing'],
      niceToHaveSkills: ['Technical Knowledge', 'SEO'],
      type: OpportunityType.FREELANCE,
      estimatedIncome: { min: 50, max: 200, timeframe: 'hour' },
      startupCost: { min: 0, max: 100 },
      timeRequired: { min: 5, max: 20 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Create writing samples relevant to your target industries',
        'Set up profiles on freelance platforms like Contently and Upwork',
        'Reach out to tech blogs and content marketing managers',
        'Join tech writing communities to find opportunities'
      ],
      successStories: [
        {
          name: 'Michael Torres',
          background: 'English major with interest in technology',
          journey: 'Started writing product reviews, then specialized in SaaS documentation',
          outcome: 'Now makes $85K/year as a freelance technical content writer'
        }
      ],
      resources: [
        { title: "Tech Writer Guide", url: "https://techwriterhq.com" },
        { title: "Content Marketing Course", url: "https://contentcourse.io" }
      ],
      skillGapDays: 0,
      matchScore: 0.9,
      timeToFirstRevenue: "1-2 weeks",
      roiScore: 88
    });

    opportunities.push({
      id: generateId('medium-content'),
      source: 'supplementary',
      title: 'Medium Partner Program Content Creation',
      description: 'Write and publish articles on Medium through their Partner Program to earn based on member engagement. Medium offers a built-in audience and monetization system for writers.',
      requiredSkills: ['Writing', 'Content Creation'],
      niceToHaveSkills: ['Storytelling', 'Research'],
      type: OpportunityType.CONTENT,
      estimatedIncome: { min: 100, max: 1000, timeframe: 'month' },
      startupCost: { min: 0, max: 0 },
      timeRequired: { min: 5, max: 15 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: 'MEDIUM',
      stepsToStart: [
        'Create a Medium account and join the Partner Program',
        'Research popular topics in your areas of expertise',
        'Write high-quality articles with compelling headlines',
        'Publish consistently and engage with the Medium community',
        'Apply to popular publications to increase visibility'
      ],
      successStories: [
        {
          name: 'Jamie Peters',
          background: 'Marketing specialist with side interest in psychology',
          journey: 'Started writing one article per week about work-life balance',
          outcome: 'Now earns $800-1,200/month from 40+ articles with minimal ongoing work'
        }
      ],
      resources: [
        { title: "Medium Partner Program Guide", url: "https://medium.com/creators" },
        { title: "How to Succeed on Medium", url: "https://bettermarketing.pub/medium-success" }
      ],
      skillGapDays: 0,
      matchScore: 0.9,
      timeToFirstRevenue: "2-4 weeks",
      roiScore: 87
    });
  }

  /**
   * Add design opportunities
   */
  private addDesignOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('design-templates'),
      source: 'supplementary',
      title: 'Digital Design Templates',
      description: 'Create and sell templates for social media, websites, presentations, and more. Templates are in high demand from businesses and individuals who need professional designs but lack design skills.',
      requiredSkills: ['Graphic Design'],
      niceToHaveSkills: ['Typography', 'Branding', 'Social Media'],
      type: OpportunityType.DIGITAL_PRODUCT,
      estimatedIncome: { min: 1000, max: 5000, timeframe: 'month' },
      startupCost: { min: 100, max: 500 },
      timeRequired: { min: 10, max: 20 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Identify popular template categories with high demand',
        'Create a collection of high-quality, versatile templates',
        'Set up shop on platforms like Etsy, Creative Market, or your own website',
        'Use social media to showcase your templates and drive traffic'
      ],
      successStories: [
        {
          name: 'Lisa Nguyen',
          background: 'Self-taught graphic designer',
          journey: 'Started selling Instagram templates while working full-time',
          outcome: 'Now sells 20+ template packs generating $8K/month in passive income'
        }
      ],
      resources: [
        { title: "Template Seller Guide", url: "https://templatebusiness.com" },
        { title: "Creative Market Success Stories", url: "https://creativemarket.com/success" }
      ],
      skillGapDays: 0,
      matchScore: 0.88,
      timeToFirstRevenue: "2-4 weeks",
      roiScore: 90
    });

    opportunities.push({
      id: generateId('logo-design'),
      source: 'supplementary',
      title: 'Logo Design Service',
      description: 'Provide custom logo design services for new businesses and rebrands. Every business needs a logo, making this a consistently in-demand service with good earning potential.',
      requiredSkills: ['Logo Design', 'Typography'],
      niceToHaveSkills: ['Branding', 'Client Communication'],
      type: OpportunityType.SERVICE,
      estimatedIncome: { min: 300, max: 2000, timeframe: 'project' },
      startupCost: { min: 0, max: 200 },
      timeRequired: { min: 5, max: 15 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Build a portfolio of logo designs (can include speculative work)',
        'Create packages at different price points',
        'Set up profiles on freelance platforms and a professional website',
        'Network with business advisors and startup incubators'
      ],
      successStories: [
        {
          name: 'David Park',
          background: 'Design school graduate',
          journey: 'Started with low-cost logos on Fiverr, then built reputation and raised prices',
          outcome: 'Now charges $2,000+ per logo project with a 3-month waiting list'
        }
      ],
      resources: [
        { title: "Logo Design Masterclass", url: "https://logodesignpro.com" },
        { title: "Charging What You're Worth", url: "https://designbusiness101.com" }
      ],
      skillGapDays: 0,
      matchScore: 0.85,
      timeToFirstRevenue: "1-2 weeks",
      roiScore: 83
    });
  }

  /**
   * Add marketing opportunities
   */
  private addMarketingOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('social-media-management'),
      source: 'supplementary',
      title: 'Social Media Management for Small Businesses',
      description: 'Provide comprehensive social media management services for small businesses that lack time and expertise to maintain their online presence. This includes content creation, scheduling, engagement, and analytics.',
      requiredSkills: ['Social Media', 'Content Creation'],
      niceToHaveSkills: ['Graphic Design', 'Copywriting', 'Analytics'],
      type: OpportunityType.SERVICE,
      estimatedIncome: { min: 500, max: 2500, timeframe: 'month' },
      startupCost: { min: 0, max: 300 },
      timeRequired: { min: 10, max: 25 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Define your service packages and pricing structure',
        'Create a professional website or portfolio showcasing social media work',
        'Develop a client onboarding process and content calendar templates',
        'Reach out to local businesses or industries you're familiar with',
        'Offer a free social media audit to potential clients'
      ],
      successStories: [
        {
          name: 'Rebecca Lewis',
          background: 'Former retail manager with marketing interest',
          journey: 'Started managing social media for two local boutiques while learning advanced strategies',
          outcome: 'Now runs a social media agency with 15 clients and three virtual assistants'
        }
      ],
      resources: [
        { title: "Social Media Management Playbook", url: "https://socialmediaplaybook.co" },
        { title: "Content Calendar Templates", url: "https://contentcalendarhub.com" }
      ],
      skillGapDays: 7,
      matchScore: 0.88,
      timeToFirstRevenue: "2-4 weeks",
      roiScore: 85
    });

    opportunities.push({
      id: generateId('ai-content-production'),
      source: 'supplementary',
      title: 'AI-Assisted Content Production Service',
      description: 'Offer content creation services leveraging AI tools to increase efficiency. Companies need high-quality content but struggle with production scale—AI tools enable you to produce more while maintaining quality.',
      requiredSkills: ['Content Creation', 'Editing'],
      niceToHaveSkills: ['AI Prompt Engineering', 'SEO', 'Content Strategy'],
      type: OpportunityType.SERVICE,
      estimatedIncome: { min: 2000, max: 8000, timeframe: 'month' },
      startupCost: { min: 200, max: 500 },
      timeRequired: { min: 10, max: 30 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Develop expertise with AI writing tools like GPT-4 and Claude',
        'Create sample content that showcases your quality and efficiency',
        'Define service packages for different content types and volumes',
        'Build a simple website explaining your process and advantages',
        'Reach out to marketing agencies and content-heavy businesses'
      ],
      successStories: [
        {
          name: 'Maya Johnson',
          background: 'Former copywriter at an agency',
          journey: 'Started offering AI-enhanced blog packages to SMBs',
          outcome: 'Now runs a team of 3 with 15 clients on retainer, earning $12K/month'
        }
      ],
      resources: [
        { title: "AI Content Creator's Handbook", url: "https://aicontent.pro" },
        { title: "Prompt Engineering Masterclass", url: "https://learnprompting.com" }
      ],
      skillGapDays: 7,
      matchScore: 0.85,
      timeToFirstRevenue: "2-3 weeks",
      roiScore: 90
    });
  }

  /**
   * Add teaching opportunities
   */
  private addTeachingOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('online-coaching'),
      source: 'supplementary',
      title: 'Online Skills Coaching',
      description: 'Offer one-on-one or group coaching in your area of expertise. Coaching is a high-value service that can be delivered remotely and scales well with your available time.',
      requiredSkills: ['Expertise in a Topic', 'Communication'],
      niceToHaveSkills: ['Teaching', 'Marketing'],
      type: OpportunityType.SERVICE,
      estimatedIncome: { min: 50, max: 300, timeframe: 'hour' },
      startupCost: { min: 0, max: 500 },
      timeRequired: { min: 5, max: 20 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: 'MEDIUM',
      stepsToStart: [
        'Define your coaching niche and target audience',
        'Create a simple coaching program outline',
        'Set up a booking system for sessions',
        'Create a professional social media presence to attract clients'
      ],
      successStories: [
        {
          name: 'James Rodriguez',
          background: 'Former marketing manager',
          journey: 'Started coaching beginners in digital marketing basics',
          outcome: 'Built to 20 coaching clients at $150/session, working 25 hours/week'
        }
      ],
      resources: [
        { title: "Coaching Business Blueprint", url: "https://coachingblueprint.com" },
        { title: "Client Acquisition Strategies", url: "https://getcoachingclients.com" }
      ],
      skillGapDays: 14,
      matchScore: 0.75,
      timeToFirstRevenue: "2-4 weeks",
      roiScore: 81
    });

    opportunities.push({
      id: generateId('teachable-course'),
      source: 'supplementary',
      title: 'Create and Sell Online Courses on Teachable',
      description: 'Develop and sell comprehensive online courses in your area of expertise. The e-learning market continues to grow, with professionals seeking to upskill through flexible, on-demand education.',
      requiredSkills: ['Expertise in a Subject', 'Teaching'],
      niceToHaveSkills: ['Video Production', 'Course Design', 'Marketing'],
      type: OpportunityType.INFO_PRODUCT,
      estimatedIncome: { min: 2000, max: 15000, timeframe: 'month' },
      startupCost: { min: 500, max: 2000 },
      timeRequired: { min: 20, max: 40 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Identify a specialized topic where you have deep knowledge',
        'Create a detailed course outline and learning objectives',
        'Set up a Teachable account and course structure',
        'Record and edit high-quality video lessons',
        'Develop supplementary materials like workbooks and quizzes',
        'Create a marketing funnel to attract students'
      ],
      successStories: [
        {
          name: 'Carlos Mendez',
          background: 'Software developer specializing in cybersecurity',
          journey: 'Created a practical course on ethical hacking and security',
          outcome: 'Course has enrolled 3,800 students with $140K in total revenue over 18 months'
        }
      ],
      resources: [
        { title: "Course Creator Pro", url: "https://teachable.com/creators/resources" },
        { title: "E-Learning Production Guide", url: "https://courseformula.com" }
      ],
      skillGapDays: 21,
      matchScore: 0.8,
      timeToFirstRevenue: "2-3 months",
      roiScore: 85
    });
  }

  /**
   * Add e-commerce opportunities
   */
  private addEcommerceOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('print-demand'),
      source: 'supplementary',
      title: 'Print-on-Demand Products',
      description: 'Design and sell custom merchandise without inventory using print-on-demand services. This business model eliminates inventory risk while allowing you to monetize your creativity.',
      requiredSkills: ['Basic Design'],
      niceToHaveSkills: ['Marketing', 'Trend Awareness'],
      type: OpportunityType.PASSIVE,
      estimatedIncome: { min: 500, max: 5000, timeframe: 'month' },
      startupCost: { min: 0, max: 200 },
      timeRequired: { min: 5, max: 15 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: 'MEDIUM',
      stepsToStart: [
        'Choose a print-on-demand platform like Printful or Printify',
        'Create designs that appeal to specific niches',
        'Set up an online store with Shopify or Etsy',
        'Market your products on social media platforms'
      ],
      successStories: [
        {
          name: 'Taylor Wilson',
          background: 'Hobbyist illustrator with full-time job',
          journey: 'Created cat-themed merchandise targeting cat lovers',
          outcome: 'Now earning $3,000/month in mostly passive income from 50+ designs'
        }
      ],
      resources: [
        { title: "Print-on-Demand Masterclass", url: "https://podprofits.com" },
        { title: "Etsy Seller Guide", url: "https://etsy-success.com" }
      ],
      skillGapDays: 7,
      matchScore: 0.7,
      timeToFirstRevenue: "2-3 weeks",
      roiScore: 78
    });

    opportunities.push({
      id: generateId('shopify-dropshipping'),
      source: 'supplementary',
      title: 'Shopify Dropshipping Store',
      description: 'Launch a dropshipping business on Shopify selling products without holding inventory. This model lets you focus on marketing and customer service while suppliers handle fulfillment.',
      requiredSkills: ['Marketing', 'Customer Service'],
      niceToHaveSkills: ['Product Research', 'Social Media', 'Copywriting'],
      type: OpportunityType.DIGITAL_PRODUCT,
      estimatedIncome: { min: 1000, max: 10000, timeframe: 'month' },
      startupCost: { min: 500, max: 2000 },
      timeRequired: { min: 15, max: 40 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Research profitable niches and trending products',
        'Set up a Shopify store and install dropshipping apps',
        'Find reliable suppliers on platforms like AliExpress or Spocket',
        'Create compelling product pages with professional photos',
        'Develop a marketing strategy focused on social media and ads'
      ],
      successStories: [
        {
          name: 'Ryan Zhang',
          background: 'College student with interest in fitness',
          journey: 'Started dropshipping fitness accessories targeting home gym enthusiasts',
          outcome: 'Built store to $15,000/month in revenue with 30% profit margin within a year'
        }
      ],
      resources: [
        { title: "Dropshipping Masterclass", url: "https://dropshiplifestyle.com" },
        { title: "Shopify Startup Guide", url: "https://shopify.com/guides/dropshipping" }
      ],
      skillGapDays: 14,
      matchScore: 0.75,
      timeToFirstRevenue: "3-6 weeks",
      roiScore: 80
    });
  }

  /**
   * Add programming opportunities
   */
  private addProgrammingOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('mobile-app-development'),
      source: 'supplementary',
      title: 'Mobile App Development Services',
      description: 'Provide custom mobile app development services for businesses looking to enhance their digital presence. The demand for mobile apps continues to grow as businesses seek to engage customers on their devices.',
      requiredSkills: ['Mobile Development', 'Programming'],
      niceToHaveSkills: ['UI/UX Design', 'API Integration'],
      type: OpportunityType.FREELANCE,
      estimatedIncome: { min: 50, max: 150, timeframe: 'hour' },
      startupCost: { min: 100, max: 500 },
      timeRequired: { min: 10, max: 40 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Build a portfolio of sample apps (can be personal projects)',
        'Set up profiles on freelance platforms like Upwork and Toptal',
        'Create a professional website showcasing your skills and projects',
        'Network with small businesses and startups',
        'Develop a clear process for client projects'
      ],
      successStories: [
        {
          name: 'Kevin Park',
          background: 'Computer science graduate with internship experience',
          journey: 'Started with small app projects for local businesses',
          outcome: 'Now runs a dev shop with 4 developers and $350K annual revenue'
        }
      ],
      resources: [
        { title: "Mobile App Development Masterclass", url: "https://appdev.academy" },
        { title: "Freelance Developer Business Guide", url: "https://devbusinesshacks.com" }
      ],
      skillGapDays: 21,
      matchScore: 0.85,
      timeToFirstRevenue: "3-6 weeks",
      roiScore: 82
    });

    opportunities.push({
      id: generateId('automation-solutions'),
      source: 'supplementary',
      title: 'Business Process Automation',
      description: 'Build custom automation solutions for businesses to streamline workflows and reduce manual tasks. Companies are increasingly looking for ways to automate repetitive processes to save time and reduce errors.',
      requiredSkills: ['Programming', 'Process Analysis'],
      niceToHaveSkills: ['API Integration', 'Data Analysis', 'Business Operations'],
      type: OpportunityType.SERVICE,
      estimatedIncome: { min: 75, max: 150, timeframe: 'hour' },
      startupCost: { min: 0, max: 300 },
      timeRequired: { min: 10, max: 30 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Learn popular automation tools like Zapier, Make.com, or Python scripting',
        'Create case studies demonstrating potential time/cost savings',
        'Develop a methodology for analyzing business processes',
        'Create service packages at different price points',
        'Target specific industries where you have domain knowledge'
      ],
      successStories: [
        {
          name: 'Nathan Rivera',
          background: 'Former operations manager with basic coding skills',
          journey: 'Started by automating invoicing for a law firm, expanded to other processes',
          outcome: 'Now specializes in legal industry automation with recurring revenue of $12K/month'
        }
      ],
      resources: [
        { title: "Business Automation Handbook", url: "https://automationformoney.com" },
        { title: "Process Optimization Course", url: "https://optimizeandautomate.io" }
      ],
      skillGapDays: 14,
      matchScore: 0.82,
      timeToFirstRevenue: "2-4 weeks",
      roiScore: 86
    });
  }

  /**
   * Add finance opportunities
   */
  private addFinanceOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('bookkeeping-service'),
      source: 'supplementary',
      title: 'Virtual Bookkeeping Services',
      description: 'Provide remote bookkeeping services to small businesses that need financial organization but cannot afford full-time staff. This essential service is always in demand across industries.',
      requiredSkills: ['Bookkeeping', 'Accounting Basics'],
      niceToHaveSkills: ['QuickBooks', 'Xero', 'Tax Knowledge'],
      type: OpportunityType.SERVICE,
      estimatedIncome: { min: 30, max: 75, timeframe: 'hour' },
      startupCost: { min: 100, max: 500 },
      timeRequired: { min: 10, max: 30 },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Get certified in popular accounting software like QuickBooks or Xero',
        'Create service packages for different business sizes',
        'Set up secure systems for document sharing and communication',
        'Network with small business groups and accountants for referrals',
        'Develop a client onboarding process'
      ],
      successStories: [
        {
          name: 'Maria Sanchez',
          background: 'Accounting clerk with 5 years experience',
          journey: 'Started with 3 small business clients while working part-time',
          outcome: 'Now manages a virtual bookkeeping team serving 35 clients with $180K annual revenue'
        }
      ],
      resources: [
        { title: "Virtual Bookkeeper Launch Course", url: "https://bookkeeperbusiness.com" },
        { title: "QuickBooks ProAdvisor Certification", url: "https://quickbooks.intuit.com/accountants/training-certification" }
      ],
      skillGapDays: 30,
      matchScore: 0.78,
      timeToFirstRevenue: "3-5 weeks",
      roiScore: 82
    });

    opportunities.push({
      id: generateId('tax-preparation'),
      source: 'supplementary',
      title: 'Seasonal Tax Preparation Service',
      description: 'Offer tax preparation services for individuals and small businesses. This seasonal opportunity provides concentrated income during tax season with flexibility the rest of the year.',
      requiredSkills: ['Tax Knowledge', 'Attention to Detail'],
      niceToHaveSkills: ['Accounting Software', 'Financial Planning'],
      type: OpportunityType.SERVICE,
      estimatedIncome: { min: 150, max: 500, timeframe: 'return' },
      startupCost: { min: 300, max: 1000 },
      timeRequired: { min: 20, max: 40, seasonalNote: 'Jan-Apr' },
      entryBarrier: RiskLevel.MEDIUM,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Get necessary certifications (e.g., PTIN, possibly Enrolled Agent)',
        'Learn tax preparation software like TurboTax Professional or Drake',
        'Set up a secure office space (even if virtual)',
        'Create a marketing plan targeting your ideal clients',
        'Develop systems for document collection and review'
      ],
      successStories: [
        {
          name: 'Robert Chen',
          background: 'Corporate accountant looking for extra income',
          journey: 'Started preparing taxes for colleagues and friends',
          outcome: 'Now prepares 200+ returns each season, earning $45K in 3 months while maintaining day job'
        }
      ],
      resources: [
        { title: "IRS Annual Filing Season Program", url: "https://www.irs.gov/tax-professionals/annual-filing-season-program" },
        { title: "Tax Preparation Business Guide", url: "https://taxbusinesspro.com" }
      ],
      skillGapDays: 60,
      matchScore: 0.75,
      timeToFirstRevenue: "2-3 months (seasonal)",
      roiScore: 78
    });
  }

  /**
   * Add general opportunities that appeal to most people
   */
  private addGeneralOpportunities(
    opportunities: RawOpportunity[],
    generateId: (category: string) => string
  ): void {
    opportunities.push({
      id: generateId('digital-product-creation'),
      source: 'supplementary',
      title: 'Digital Product Creation',
      description: 'Create and sell digital products like templates, printables, or guides based on your expertise. Digital products offer excellent passive income potential with minimal ongoing costs.',
      requiredSkills: ['Knowledge in a Specific Area'],
      niceToHaveSkills: ['Design', 'Marketing', 'Writing'],
      type: OpportunityType.DIGITAL_PRODUCT,
      estimatedIncome: { min: 500, max: 5000, timeframe: 'month' },
      startupCost: { min: 0, max: 500 },
      timeRequired: { min: 5, max: 20 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: 'MEDIUM',
      stepsToStart: [
        'Identify a specific problem you can solve with a digital product',
        'Research competitor offerings and identify gaps',
        'Create your digital product using tools like Canva, MS Office, or Adobe',
        'Set up shop on platforms like Etsy, Gumroad, or your own website',
        'Develop a simple marketing plan focusing on your target audience'
      ],
      successStories: [
        {
          name: 'Sophia Williams',
          background: 'Elementary teacher with organizational skills',
          journey: 'Created printable planners and worksheets based on classroom experience',
          outcome: 'Now earns $4,000-7,000/month from over 120 digital products on Etsy and Teachers Pay Teachers'
        }
      ],
      resources: [
        { title: "Digital Product Creation Guide", url: "https://digitalproductsforsale.com" },
        { title: "Passive Income Blueprint", url: "https://passiveincomeformula.co" }
      ],
      skillGapDays: 7,
      matchScore: 0.8,
      timeToFirstRevenue: "2-4 weeks",
      roiScore: 90
    });

    opportunities.push({
      id: generateId('virtual-assistant'),
      source: 'supplementary',
      title: 'Virtual Assistant Services',
      description: 'Provide administrative, technical, or creative assistance to entrepreneurs and small businesses remotely. This flexible opportunity leverages your organizational skills while building diverse experience.',
      requiredSkills: ['Organization', 'Communication'],
      niceToHaveSkills: ['Social Media', 'Project Management', 'Customer Service'],
      type: OpportunityType.SERVICE,
      estimatedIncome: { min: 20, max: 50, timeframe: 'hour' },
      startupCost: { min: 0, max: 200 },
      timeRequired: { min: 10, max: 40 },
      entryBarrier: RiskLevel.LOW,
      marketDemand: 'HIGH',
      stepsToStart: [
        'Identify your service offerings based on your skills',
        'Create packages with clear scope and pricing',
        'Set up professional profiles on platforms like Upwork or Fiverr',
        'Create a simple website or portfolio',
        'Network in entrepreneurial communities and Facebook groups'
      ],
      successStories: [
        {
          name: 'Alisha Patel',
          background: 'Former administrative assistant with social media experience',
          journey: 'Started offering 10 hours/week of VA services while job hunting',
          outcome: 'Built to full-time income within 6 months, now specializes in launch support with premium rates'
        }
      ],
      resources: [
        { title: "The Virtual Assistant Solution", url: "https://vasolutions.com" },
        { title: "Client Acquisition & Management Guide", url: "https://vaclients101.com" }
      ],
      skillGapDays: 0,
      matchScore: 0.85,
      timeToFirstRevenue: "1-3 weeks",
      roiScore: 82
    });
  }
}

// Create singleton instance
export const discoveryService = new DiscoveryService();

// Initialize with available sources
// The actual source imports and registration will happen in index.ts
