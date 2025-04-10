/**
 * Discovery Service
 *
 * This service coordinates monetization opportunity discovery by managing various
 * opportunity sources and applying intelligent matching algorithms to find the best
 * opportunities for each user based on their skills and preferences.
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
import { v4 as uuidv4 } from "uuid";

class DiscoveryService {
  private sources: Map<string, OpportunitySource> = new Map();
  private sourceTimeout = 30000; // 30 seconds timeout for sources
  private opportunityCache: Map<string, RawOpportunity> = new Map();
  private cacheCleanupInterval: NodeJS.Timer | null = null;
  private cacheExpirationMs = 30 * 60 * 1000; // 30 minutes cache expiration
  private mlEngine = new MLEngine();
  private skillGapAnalyzer = new SkillGapAnalyzer();

  constructor() {
    this.setupCacheCleanup();
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
      15 * 60 * 1000,
    );
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
   * Get opportunities from a specific source
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

    try {
      // Create minimal preferences object for the source
      const preferences: DiscoveryPreferences = {
        skills: skills || [],
        timeAvailability: "any",
        riskAppetite: "any",
        incomeGoals: 0,
        workPreference: "any",
      };

      const opportunities = await Promise.race([
        source.getOpportunities(skills || [], preferences),
        new Promise<RawOpportunity[]>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Source ${sourceId} timed out`)),
            this.sourceTimeout,
          ),
        ),
      ]);

      // Cache the opportunities for potential reuse
      opportunities.forEach((opp) => {
        if (opp.id && !this.opportunityCache.has(opp.id)) {
          this.opportunityCache.set(opp.id, {
            ...opp,
            _cachedAt: Date.now(), // Add timestamp for cache expiration
          });
        }
      });

      // Return limited number of opportunities
      return opportunities.slice(0, limit);
    } catch (error) {
      logger.error(
        `Error fetching from source ${sourceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(`Failed to fetch opportunities from source ${sourceId}`);
    }
  }

  /**
   * Main method to discover personalized opportunities for a user
   */
  public async discoverOpportunities(
    userId: number,
    preferences: DiscoveryPreferences,
  ): Promise<DiscoveryResults> {
    const requestId = uuidv4();
    logger.info(
      `Starting discovery for user ${userId} (requestId: ${requestId})`,
    );

    try {
      // Add userId to preferences for tracking
      preferences.userId = userId;

      // Get user profile data
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

      // Get all sources and collect their opportunities
      logger.info(`Fetching opportunities from ${this.sources.size} sources`);
      const sourcePromises = Array.from(this.sources.entries()).map(
        async ([sourceId, source]) => {
          try {
            return await Promise.race([
              source.getOpportunities(preferences.skills, preferences),
              new Promise<RawOpportunity[]>((_, reject) =>
                setTimeout(
                  () => reject(new Error(`Source ${sourceId} timed out`)),
                  this.sourceTimeout,
                ),
              ),
            ]);
          } catch (error) {
            logger.error(
              `Error fetching from source ${sourceId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            return [];
          }
        },
      );

      // Collect results from all sources
      const sourceResults = (await Promise.all(sourcePromises)).flat();
      logger.info(
        `Collected ${sourceResults.length} total opportunities from all sources`,
      );

      // Find similar users in parallel while we're processing opportunities
      const similarUsersPromise = this.findSimilarUsers(
        userId,
        preferences.skills,
      );

      // Process and filter opportunities
      const filteredResults = await this.processOpportunities(
        sourceResults,
        preferences,
        previousOpportunities.map((o) => o.opportunityData),
      );

      // Get similar users result
      const similarUsers = await similarUsersPromise;

      // Save the discovery results to the user's account
      try {
        const saveResult = await db.insert(monetizationOpportunities).values({
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
      };
    } catch (error) {
      logger.error(
        `Error in discovery service: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Find similar users based on skill matching
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

      // Get each user's profile to access their skills
      const similarUsers: SimilarUser[] = [];

      // For better performance, process in batches of 10 users
      const batchSize = 10;
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

              const commonSkills = skills.filter((skill) =>
                userSkills.some(
                  (userSkill) =>
                    userSkill.toLowerCase() === skill.toLowerCase(),
                ),
              );

              if (commonSkills.length === 0) return null;

              // Calculate similarity score (0-1)
              const similarity =
                commonSkills.length /
                Math.max(skills.length, userSkills.length);

              // Count shared opportunities
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
   * Process, filter, score and enhance opportunities based on user preferences
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

    // Add supplementary opportunities to ensure variety and inspiration
    logger.info(
      `Adding supplementary opportunities to ensure variety and inspirational content`,
    );
    await this.addSupplementaryOpportunities(newOpportunities, preferences);

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

    // Apply scoring based on user preferences
    let scoredOpportunities: RawOpportunity[];

    if (preferences.useML) {
      // Use ML engine for more sophisticated scoring
      logger.info(`Using ML Engine for opportunity scoring`);
      scoredOpportunities = this.mlEngine.predictBestOpportunities(
        filteredOpportunities,
        preferences,
        preferences.userId,
      );
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
      return enhancedOpportunities;
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
        // We'll allow up to 25% more time than user specified to ensure variety
        const adjustedMaxHours = maxHoursPerWeek * 1.25;
        if (opp.timeRequired && opp.timeRequired.min > adjustedMaxHours) {
          return false;
        }
      }

      // Filter by risk tolerance if specified, with some flexibility
      if (preferences.riskAppetite !== "any") {
        const userRiskLevel = this.getRiskLevelValue(preferences.riskAppetite);
        const opportunityRiskLevel = this.getRiskLevelValue(opp.entryBarrier);

        // Allow one level higher risk than user's preference for diversity
        const adjustedRiskLevel = userRiskLevel + 1;
        if (opportunityRiskLevel > adjustedRiskLevel) {
          return false;
        }
      }

      // Filter by income goals if specified, but be more inclusive
      if (preferences.incomeGoals > 0) {
        // Check if the opportunity can potentially meet income goals
        // Convert estimated income to monthly basis for comparison
        const monthlyIncomeMin = this.convertToMonthlyIncome(
          opp.estimatedIncome.min,
          opp.estimatedIncome.timeframe,
        );

        // Be more inclusive - keep opportunities that can meet at least 15% of income goals
        if (monthlyIncomeMin < preferences.incomeGoals * 0.15) {
          return false;
        }
      }

      // Filter by work preference if specified
      if (preferences.workPreference !== "any" && opp.location) {
        if (
          preferences.workPreference !== "both" &&
          opp.location !== "both" &&
          opp.location !== preferences.workPreference
        ) {
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
    preferences: DiscoveryPreferences,
  ): RawOpportunity[] {
    const scoredOpportunities = opportunities.map((opp) => {
      // Initial score based on skill match
      let score = this.calculateSkillMatchScore(
        opp.requiredSkills,
        preferences.skills,
      );

      // Adjust score based on nice-to-have skills
      if (opp.niceToHaveSkills && opp.niceToHaveSkills.length > 0) {
        const niceToHaveScore =
          this.calculateSkillMatchScore(
            opp.niceToHaveSkills,
            preferences.skills,
          ) * 0.5;
        score += niceToHaveScore;
      }

      // Adjust based on income potential (weight: 20%)
      const incomeScore = this.calculateIncomeScore(
        opp.estimatedIncome,
        preferences.incomeGoals,
      );
      score += incomeScore * 0.2;

      // Adjust based on time requirement match (weight: 15%)
      const timeScore = this.calculateTimeScore(
        opp.timeRequired,
        preferences.timeAvailability,
      );
      score += timeScore * 0.15;

      // Adjust based on risk level match (weight: 15%)
      const riskScore = this.calculateRiskScore(
        opp.entryBarrier,
        preferences.riskAppetite,
      );
      score += riskScore * 0.15;

      // Return opportunity with calculated score
      return {
        ...opp,
        matchScore: Math.min(1, Math.max(0, score)), // Ensure score is between 0-1
      };
    });

    // Sort by score (highest first)
    return scoredOpportunities.sort(
      (a, b) => (b.matchScore || 0) - (a.matchScore || 0),
    );
  }

  /**
   * Ensure diverse results by balancing opportunity types
   */
  private ensureDiverseResults(
    scoredOpportunities: RawOpportunity[],
  ): RawOpportunity[] {
    // 1. Group opportunities by type for better category distribution
    const opportunitiesByType: Record<string, RawOpportunity[]> = {};

    scoredOpportunities.forEach((opp) => {
      const type = opp.type.toString();
      if (!opportunitiesByType[type]) {
        opportunitiesByType[type] = [];
      }
      opportunitiesByType[type].push(opp);
    });

    // 2. Create a balanced selection of opportunities across types
    const diverseOpportunities: RawOpportunity[] = [];

    // Get top 5 from each category (if available)
    Object.values(opportunitiesByType).forEach((opps) => {
      // Take top 5 from each type to show more diverse opportunities
      diverseOpportunities.push(...opps.slice(0, 5));
    });

    // 3. Add any remaining top opportunities until we reach 15-20 opportunities total
    const remainingCount = Math.max(0, 20 - diverseOpportunities.length);
    if (remainingCount > 0) {
      // Get opportunities not already included
      const alreadyIncludedIds = new Set(diverseOpportunities.map((o) => o.id));
      const remainingOpps = scoredOpportunities.filter(
        (o) => !alreadyIncludedIds.has(o.id),
      );

      // Add top remaining opportunities
      diverseOpportunities.push(...remainingOpps.slice(0, remainingCount));
    }

    // 4. Sort the diverse set by score
    diverseOpportunities.sort(
      (a, b) => (b.matchScore || 0) - (a.matchScore || 0),
    );

    return diverseOpportunities;
  }

  /**
   * Calculate skill match score between required skills and user skills
   * @returns Score between 0-1
   */
  private calculateSkillMatchScore(
    requiredSkills: string[],
    userSkills: string[],
  ): number {
    if (!requiredSkills || requiredSkills.length === 0) return 0.5; // Neutral score for no skills

    // Normalize skills to lowercase for comparison
    const normalizedRequiredSkills = requiredSkills.map((s) => s.toLowerCase());
    const normalizedUserSkills = userSkills.map((s) => s.toLowerCase());

    // Calculate direct matches
    const directMatches = normalizedRequiredSkills.filter((skill) =>
      normalizedUserSkills.includes(skill),
    ).length;

    // Calculate partial matches (where one skill contains the other)
    const partialMatches = normalizedRequiredSkills.filter(
      (reqSkill) =>
        !normalizedUserSkills.includes(reqSkill) && // Not already counted as direct match
        normalizedUserSkills.some(
          (userSkill) =>
            reqSkill.includes(userSkill) || userSkill.includes(reqSkill),
        ),
    ).length;

    // Weight direct matches higher than partial matches
    const weightedMatchCount = directMatches + partialMatches * 0.5;

    return weightedMatchCount / normalizedRequiredSkills.length;
  }

  /**
   * Calculate income potential score
   * @returns Score between 0-1
   */
  private calculateIncomeScore(
    estimatedIncome: { min: number; max: number; timeframe: string },
    incomeGoal: number,
  ): number {
    if (!incomeGoal) return 0.5; // Neutral score if no goal

    // Convert to monthly income
    const monthlyIncome = this.convertToMonthlyIncome(
      (estimatedIncome.min + estimatedIncome.max) / 2, // Use average
      estimatedIncome.timeframe,
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
    timeRequired: { min: number; max: number },
    timeAvailability: string,
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
  private calculateRiskScore(
    entryBarrier: RiskLevel,
    riskAppetite: string,
  ): number {
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
  private getRiskLevelValue(risk: string | RiskLevel): number {
    if (typeof risk !== "string" && typeof risk !== "number") return 2; // Default to medium

    if (typeof risk === "string") {
      const riskLower = risk.toLowerCase();
      if (
        riskLower === "low" ||
        riskLower === RiskLevel.LOW.toString().toLowerCase()
      )
        return 1;
      if (
        riskLower === "high" ||
        riskLower === RiskLevel.HIGH.toString().toLowerCase()
      )
        return 3;
      return 2; // Default to medium
    }

    // If risk is already a number (from enum)
    return risk === RiskLevel.LOW ? 1 : risk === RiskLevel.HIGH ? 3 : 2;
  }

  /**
   * Parse time availability string to hours per week
   * @returns Hours per week
   */
  private parseTimeAvailability(time: string): number {
    if (!time || time === "any") return 0;

    const timeLower = time.toLowerCase();
    if (timeLower.includes("full")) return 40;
    if (timeLower.includes("part")) return 20;
    if (timeLower.includes("evenings")) return 10;
    if (timeLower.includes("weekends")) return 16;

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
    if (timeframeLower === "hour") return amount * 160; // 40h × 4 weeks
    if (timeframeLower === "day") return amount * 20; // 5 days × 4 weeks
    if (timeframeLower === "week") return amount * 4;
    if (timeframeLower === "month") return amount;
    if (timeframeLower === "year") return amount / 12;
    if (timeframeLower === "project") return amount / 3; // Assume 3 months per project avg

    return amount; // Default if timeframe unknown
  }

  /**
   * Add supplementary opportunities to ensure variety and inspirational content
   * This method enriches the opportunity array with high-quality options
   */
  private async addSupplementaryOpportunities(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
  ): Promise<void> {
    logger.info("Adding supplementary opportunities to enhance results");

    // Check if useEnhanced flag is set to use Anthropic AI for generating opportunities
    if (preferences.useEnhanced) {
      logger.info(
        "Using Anthropic AI to generate enhanced opportunity suggestions",
      );

      try {
        // Generate thoughtful opportunities using Anthropic AI
        const anthropicOpportunities =
          await anthropicHelper.generateOpportunities(preferences, 5);

        if (anthropicOpportunities && anthropicOpportunities.length > 0) {
          logger.info(
            `Successfully added ${anthropicOpportunities.length} AI-generated opportunities`,
          );
          opportunities.push(...anthropicOpportunities);

          // If we got a good number of AI-generated opportunities, we can return early
          if (anthropicOpportunities.length >= 3) {
            return;
          }
          // Otherwise, continue with hardcoded opportunities to supplement
        }
      } catch (error) {
        logger.error(
          `Error generating opportunities with Anthropic AI: ${error instanceof Error ? error.message : String(error)}`,
        );
        logger.info("Falling back to standard supplementary opportunities");
      }
    }

    // Analyze user skills to determine which hardcoded opportunities to add
    const hasWebSkills = this.hasSkillsInCategory(preferences.skills, [
      "web",
      "design",
      "html",
      "css",
      "javascript",
      "react",
      "frontend",
      "front-end",
      "ui",
    ]);

    const hasWritingSkills = this.hasSkillsInCategory(preferences.skills, [
      "writ",
      "blog",
      "content",
      "edit",
      "copy",
      "article",
      "journalism",
      "story",
    ]);

    const hasDesignSkills = this.hasSkillsInCategory(preferences.skills, [
      "design",
      "graphic",
      "illust",
      "photo",
      "visual",
      "art",
      "ui/ux",
      "ui",
      "ux",
    ]);

    const hasMarketingSkills = this.hasSkillsInCategory(preferences.skills, [
      "market",
      "seo",
      "social media",
      "advertis",
      "sales",
      "brand",
      "growth",
      "audience",
    ]);

    const hasTeachingSkills = this.hasSkillsInCategory(preferences.skills, [
      "teach",
      "coach",
      "mentor",
      "train",
      "educat",
      "instruct",
      "tutor",
      "curriculum",
    ]);

    const hasEcommerceSkills = this.hasSkillsInCategory(preferences.skills, [
      "ecommerce",
      "product",
      "retail",
      "shop",
      "merch",
      "amazon",
      "etsy",
      "shopify",
    ]);

    const hasProgrammingSkills = this.hasSkillsInCategory(preferences.skills, [
      "program",
      "develop",
      "code",
      "software",
      "app",
      "java",
      "python",
      "swift",
      "javascript",
    ]);

    // Generate unique IDs for our supplementary opportunities
    const generateId = (prefix: string) =>
      `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Add skill-specific supplementary opportunities
    this.addWebOpportunities(opportunities, hasWebSkills, generateId);
    this.addWritingOpportunities(opportunities, hasWritingSkills, generateId);
    this.addDesignOpportunities(opportunities, hasDesignSkills, generateId);
    this.addMarketingOpportunities(
      opportunities,
      hasMarketingSkills,
      generateId,
    );
    this.addTeachingOpportunities(opportunities, hasTeachingSkills, generateId);
    this.addEcommerceOpportunities(
      opportunities,
      hasEcommerceSkills || hasMarketingSkills,
      generateId,
    );
    this.addProgrammingOpportunities(
      opportunities,
      hasProgrammingSkills,
      generateId,
    );

    // Always add these general opportunities that could appeal to most people
    this.addGeneralOpportunities(opportunities, generateId);

    logger.info(
      `Added supplementary opportunities (total opportunities: ${opportunities.length})`,
    );
  }

  /**
   * Check if user has skills in a specific category
   */
  private hasSkillsInCategory(
    userSkills: string[],
    categoryKeywords: string[],
  ): boolean {
    const normalizedUserSkills = userSkills.map((skill) => skill.toLowerCase());

    return normalizedUserSkills.some((skill) =>
      categoryKeywords.some((keyword) => skill.includes(keyword)),
    );
  }

  /**
   * Add web development opportunities
   */
  private addWebOpportunities(
    opportunities: RawOpportunity[],
    hasRelevantSkills: boolean,
    generateId: (prefix: string) => string,
  ): void {
    if (hasRelevantSkills) {
      opportunities.push({
        id: generateId("web-freelance"),
        source: "supplementary",
        title: "Responsive Web Design Freelancing",
        description:
          "Create responsive, mobile-friendly websites for small businesses and entrepreneurs. Many businesses need affordable, professional websites to establish their online presence. This opportunity allows you to leverage your web design skills while building a portfolio.",
        requiredSkills: ["HTML", "CSS", "Responsive Design"],
        niceToHaveSkills: ["JavaScript", "UI/UX", "WordPress"],
        type: OpportunityType.FREELANCE,
        estimatedIncome: { min: 50, max: 150, timeframe: "hour" },
        startupCost: { min: 0, max: 300 },
        timeRequired: { min: 10, max: 30 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Create a portfolio website showcasing your design skills",
          "Set up profiles on freelance platforms like Upwork and Fiverr",
          "Define your service packages with clear pricing",
          "Reach out to local businesses who need website updates",
        ],
        successStories: [
          {
            name: "Alex Chen",
            background: "Graphic designer who learned HTML/CSS",
            journey:
              "Started with small projects on Upwork while learning more advanced skills",
            outcome:
              "Now runs a web design agency with 5 contractors and earns $120K/year",
          },
        ],
        resources: [
          {
            title: "Web Designer Success Guide",
            url: "https://webdesignerhub.com",
          },
          {
            title: "Responsive Design Course",
            url: "https://frontend.io/responsive",
          },
        ],
        skillGapDays: 0,
        matchScore: 0.85,
        timeToFirstRevenue: "2-4 weeks",
        roiScore: 85,
      });

      opportunities.push({
        id: generateId("web-course"),
        source: "supplementary",
        title: "Create a Web Development Course",
        description:
          "Package your web design and development knowledge into an online course. Teaching others while earning passive income is a winning combination for those with technical skills.",
        requiredSkills: ["Web Development", "HTML/CSS"],
        niceToHaveSkills: ["Teaching", "Video Production"],
        type: OpportunityType.DIGITAL_PRODUCT,
        estimatedIncome: { min: 2000, max: 10000, timeframe: "month" },
        startupCost: { min: 200, max: 1000 },
        timeRequired: { min: 10, max: 20 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Create an outline of your course curriculum",
          "Record high-quality video lessons",
          "Set up on a platform like Udemy or Teachable",
          "Market your course through social media and web development communities",
        ],
        successStories: [
          {
            name: "Sarah Johnson",
            background: "Former front-end developer",
            journey: "Created a CSS Grid masterclass course in her spare time",
            outcome:
              "Course generates $5,000-8,000/month with minimal ongoing work",
          },
        ],
        resources: [
          { title: "Course Creator Pro", url: "https://coursecreatortips.com" },
          { title: "Teaching Tech Effectively", url: "https://teachtech.edu" },
        ],
        skillGapDays: 14,
        matchScore: 0.78,
        timeToFirstRevenue: "1-3 months",
        roiScore: 92,
      });
    }
  }

  /**
   * Add writing opportunities
   */
  private addWritingOpportunities(
    opportunities: RawOpportunity[],
    hasRelevantSkills: boolean,
    generateId: (prefix: string) => string,
  ): void {
    if (hasRelevantSkills) {
      opportunities.push({
        id: generateId("content-freelance"),
        source: "supplementary",
        title: "Technical Content Writing",
        description:
          "Create blog posts, tutorials, and documentation for tech companies. The demand for clear, engaging technical content is growing as more companies need to explain their products.",
        requiredSkills: ["Writing", "Editing"],
        niceToHaveSkills: ["Technical Knowledge", "SEO"],
        type: OpportunityType.FREELANCE,
        estimatedIncome: { min: 50, max: 200, timeframe: "hour" },
        startupCost: { min: 0, max: 100 },
        timeRequired: { min: 5, max: 20 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "HIGH",
        stepsToStart: [
          "Create writing samples relevant to your target industries",
          "Set up profiles on freelance platforms like Contently and Upwork",
          "Reach out to tech blogs and content marketing managers",
          "Join tech writing communities to find opportunities",
        ],
        successStories: [
          {
            name: "Michael Torres",
            background: "English major with interest in technology",
            journey:
              "Started writing product reviews, then specialized in SaaS documentation",
            outcome:
              "Now makes $85K/year as a freelance technical content writer",
          },
        ],
        resources: [
          { title: "Tech Writer Guide", url: "https://techwriterhq.com" },
          {
            title: "Content Marketing Course",
            url: "https://contentcourse.io",
          },
        ],
        skillGapDays: 0,
        matchScore: 0.9,
        timeToFirstRevenue: "1-2 weeks",
        roiScore: 88,
      });

      opportunities.push({
        id: generateId("newsletter"),
        source: "supplementary",
        title: "Paid Newsletter Subscription",
        description:
          "Launch a specialized newsletter for professionals in your niche. Email newsletters are making a comeback as people seek curated content from trusted sources.",
        requiredSkills: ["Writing", "Content Curation"],
        niceToHaveSkills: ["Marketing", "Subject Expertise"],
        type: OpportunityType.CONTENT,
        estimatedIncome: { min: 1000, max: 5000, timeframe: "month" },
        startupCost: { min: 0, max: 500 },
        timeRequired: { min: 5, max: 15 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "MEDIUM",
        stepsToStart: [
          "Choose a specific niche where you have expertise",
          "Set up on a platform like Substack or Revue",
          "Create a content calendar and consistent publishing schedule",
          "Offer both free and premium content tiers",
        ],
        successStories: [
          {
            name: "Emily Chen",
            background: "Former tech journalist",
            journey: "Started a weekly newsletter about AI and ethics",
            outcome:
              "Has 2,500 paid subscribers at $8/month ($20K monthly revenue)",
          },
        ],
        resources: [
          {
            title: "Newsletter Business Guide",
            url: "https://substackpro.com",
          },
          {
            title: "Building an Audience Course",
            url: "https://audiencegrowth.com",
          },
        ],
        skillGapDays: 7,
        matchScore: 0.82,
        timeToFirstRevenue: "1-2 months",
        roiScore: 79,
      });

      opportunities.push({
        id: generateId("medium-content"),
        source: "supplementary",
        title: "Medium Partner Program Content Creation",
        description:
          "Write and publish articles on Medium through their Partner Program to earn based on member engagement. Medium offers a built-in audience and monetization system for writers.",
        requiredSkills: ["Writing", "Content Creation"],
        niceToHaveSkills: ["Storytelling", "Research"],
        type: OpportunityType.CONTENT,
        estimatedIncome: { min: 100, max: 1000, timeframe: "month" },
        startupCost: { min: 0, max: 0 },
        timeRequired: { min: 5, max: 15 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "MEDIUM",
        stepsToStart: [
          "Create a Medium account and join the Partner Program",
          "Research popular topics in your areas of expertise",
          "Write high-quality articles with compelling headlines",
          "Publish consistently and engage with the Medium community",
          "Apply to popular publications to increase visibility",
        ],
        successStories: [
          {
            name: "Jamie Peters",
            background: "Marketing specialist with side interest in psychology",
            journey:
              "Started writing one article per week about work-life balance",
            outcome:
              "Now earns $800-1,200/month from 40+ articles with minimal ongoing work",
          },
        ],
        resources: [
          {
            title: "Medium Partner Program Guide",
            url: "https://medium.com/creators",
          },
          {
            title: "How to Succeed on Medium",
            url: "https://bettermarketing.pub/medium-success",
          },
        ],
        skillGapDays: 0,
        matchScore: 0.9,
        timeToFirstRevenue: "2-4 weeks",
        roiScore: 87,
      });
    }
  }

  /**
   * Add design opportunities
   */
  private addDesignOpportunities(
    opportunities: RawOpportunity[],
    hasRelevantSkills: boolean,
    generateId: (prefix: string) => string,
  ): void {
    if (hasRelevantSkills) {
      opportunities.push({
        id: generateId("design-templates"),
        source: "supplementary",
        title: "Digital Design Templates",
        description:
          "Create and sell templates for social media, websites, presentations, and more. Templates are in high demand from businesses and individuals who need professional designs but lack design skills.",
        requiredSkills: ["Graphic Design"],
        niceToHaveSkills: ["Typography", "Branding", "Social Media"],
        type: OpportunityType.DIGITAL_PRODUCT,
        estimatedIncome: { min: 1000, max: 5000, timeframe: "month" },
        startupCost: { min: 100, max: 500 },
        timeRequired: { min: 10, max: 20 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Identify popular template categories with high demand",
          "Create a collection of high-quality, versatile templates",
          "Set up shop on platforms like Etsy, Creative Market, or your own website",
          "Use social media to showcase your templates and drive traffic",
        ],
        successStories: [
          {
            name: "Lisa Nguyen",
            background: "Self-taught graphic designer",
            journey:
              "Started selling Instagram templates while working full-time",
            outcome:
              "Now sells 20+ template packs generating $8K/month in passive income",
          },
        ],
        resources: [
          {
            title: "Template Seller Guide",
            url: "https://templatebusiness.com",
          },
          {
            title: "Creative Market Success Stories",
            url: "https://creativemarket.com/success",
          },
        ],
        skillGapDays: 0,
        matchScore: 0.88,
        timeToFirstRevenue: "2-4 weeks",
        roiScore: 90,
      });

      opportunities.push({
        id: generateId("logo-design"),
        source: "supplementary",
        title: "Logo Design Service",
        description:
          "Provide custom logo design services for new businesses and rebrands. Every business needs a logo, making this a consistently in-demand service with good earning potential.",
        requiredSkills: ["Logo Design", "Typography"],
        niceToHaveSkills: ["Branding", "Client Communication"],
        type: OpportunityType.SERVICE,
        estimatedIncome: { min: 300, max: 2000, timeframe: "project" },
        startupCost: { min: 0, max: 200 },
        timeRequired: { min: 5, max: 15 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Build a portfolio of logo designs (can include speculative work)",
          "Create packages at different price points",
          "Set up profiles on freelance platforms and a professional website",
          "Network with business advisors and startup incubators",
        ],
        successStories: [
          {
            name: "David Park",
            background: "Design school graduate",
            journey:
              "Started with low-cost logos on Fiverr, then built reputation and raised prices",
            outcome:
              "Now charges $2,000+ per logo project with a 3-month waiting list",
          },
        ],
        resources: [
          {
            title: "Logo Design Masterclass",
            url: "https://logodesignpro.com",
          },
          {
            title: "Charging What You're Worth",
            url: "https://designbusiness101.com",
          },
        ],
        skillGapDays: 0,
        matchScore: 0.85,
        timeToFirstRevenue: "1-2 weeks",
        roiScore: 83,
      });
    }
  }

  /**
   * Add marketing opportunities
   */
  private addMarketingOpportunities(
    opportunities: RawOpportunity[],
    hasRelevantSkills: boolean,
    generateId: (prefix: string) => string,
  ): void {
    if (hasRelevantSkills) {
      opportunities.push({
        id: generateId("social-media-management"),
        source: "supplementary",
        title: "Social Media Management for Small Businesses",
        description:
          "Provide comprehensive social media management services for small businesses that lack time and expertise to maintain their online presence. This includes content creation, scheduling, engagement, and analytics.",
        requiredSkills: ["Social Media", "Content Creation"],
        niceToHaveSkills: ["Graphic Design", "Copywriting", "Analytics"],
        type: OpportunityType.SERVICE,
        estimatedIncome: { min: 500, max: 2500, timeframe: "month" },
        startupCost: { min: 0, max: 300 },
        timeRequired: { min: 10, max: 25 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "HIGH",
        stepsToStart: [
          "Define your service packages and pricing structure",
          "Create a professional website or portfolio showcasing social media work",
          "Develop a client onboarding process and content calendar templates",
          "Reach out to local businesses or industries you are familiar with",
          "Offer a free social media audit to potential clients",
        ],
        successStories: [
          {
            name: "Rebecca Lewis",
            background: "Former retail manager with marketing interest",
            journey:
              "Started managing social media for two local boutiques while learning advanced strategies",
            outcome:
              "Now runs a social media agency with 15 clients and three virtual assistants",
          },
        ],
        resources: [
          {
            title: "Social Media Management Playbook",
            url: "https://socialmediaplaybook.co",
          },
          {
            title: "Content Calendar Templates",
            url: "https://contentcalendarhub.com",
          },
        ],
        skillGapDays: 7,
        matchScore: 0.88,
        timeToFirstRevenue: "2-4 weeks",
        roiScore: 85,
      });

      opportunities.push({
        id: generateId("seo-consulting"),
        source: "supplementary",
        title: "SEO Optimization Services",
        description:
          "Help businesses improve their search engine rankings through technical SEO optimization, content strategy, and link building. Many businesses understand the importance of SEO but lack the expertise to implement effective strategies.",
        requiredSkills: ["SEO", "Content Strategy"],
        niceToHaveSkills: ["Technical SEO", "Analytics", "Link Building"],
        type: OpportunityType.SERVICE,
        estimatedIncome: { min: 75, max: 250, timeframe: "hour" },
        startupCost: { min: 100, max: 500 },
        timeRequired: { min: 10, max: 30 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Develop expertise in current SEO best practices",
          "Create case studies showing successful SEO improvements",
          "Define service packages (audits, monthly optimization, etc.)",
          "Build a website showcasing your SEO services and results",
          "Network with web developers and digital marketing agencies",
        ],
        successStories: [
          {
            name: "Marcus Johnson",
            background: "Digital marketer who specialized in SEO",
            journey:
              "Started with SEO audits for small businesses, then developed ongoing service packages",
            outcome:
              "Now charges $3,500/month per client with a portfolio of long-term retainer clients",
          },
        ],
        resources: [
          {
            title: "SEO Consultant's Handbook",
            url: "https://seoconsultantguide.com",
          },
          { title: "Ahrefs SEO Academy", url: "https://ahrefs.com/academy" },
        ],
        skillGapDays: 21,
        matchScore: 0.82,
        timeToFirstRevenue: "3-6 weeks",
        roiScore: 87,
      });

      opportunities.push({
        id: generateId("ai-content-production"),
        source: "supplementary",
        title: "AI-Assisted Content Production Service",
        description:
          "Offer content creation services leveraging AI tools to increase efficiency. Companies need high-quality content but struggle with production scale—AI tools enable you to produce more while maintaining quality.",
        requiredSkills: ["Content Creation", "Editing"],
        niceToHaveSkills: ["AI Prompt Engineering", "SEO", "Content Strategy"],
        type: OpportunityType.SERVICE,
        estimatedIncome: { min: 2000, max: 8000, timeframe: "month" },
        startupCost: { min: 200, max: 500 },
        timeRequired: { min: 10, max: 30 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "HIGH",
        stepsToStart: [
          "Develop expertise with AI writing tools like GPT-4 and Claude",
          "Create sample content that showcases your quality and efficiency",
          "Define service packages for different content types and volumes",
          "Build a simple website explaining your process and advantages",
          "Reach out to marketing agencies and content-heavy businesses",
        ],
        successStories: [
          {
            name: "Maya Johnson",
            background: "Former copywriter at an agency",
            journey: "Started offering AI-enhanced blog packages to SMBs",
            outcome:
              "Now runs a team of 3 with 15 clients on retainer, earning $12K/month",
          },
        ],
        resources: [
          {
            title: "AI Content Creator's Handbook",
            url: "https://aicontent.pro",
          },
          {
            title: "Prompt Engineering Masterclass",
            url: "https://learnprompting.com",
          },
        ],
        skillGapDays: 7,
        matchScore: 0.85,
        timeToFirstRevenue: "2-3 weeks",
        roiScore: 90,
      });
    }
  }

  /**
   * Add teaching opportunities
   */
  private addTeachingOpportunities(
    opportunities: RawOpportunity[],
    hasRelevantSkills: boolean,
    generateId: (prefix: string) => string,
  ): void {
    if (hasRelevantSkills) {
      opportunities.push({
        id: generateId("online-coaching"),
        source: "supplementary",
        title: "Online Skills Coaching",
        description:
          "Offer one-on-one or group coaching in your area of expertise. Coaching is a high-value service that can be delivered remotely and scales well with your available time.",
        requiredSkills: ["Expertise in a Topic", "Communication"],
        niceToHaveSkills: ["Teaching", "Marketing"],
        type: OpportunityType.SERVICE,
        estimatedIncome: { min: 50, max: 300, timeframe: "hour" },
        startupCost: { min: 0, max: 500 },
        timeRequired: { min: 5, max: 20 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "MEDIUM",
        stepsToStart: [
          "Define your coaching niche and target audience",
          "Create a simple coaching program outline",
          "Set up a booking system for sessions",
          "Create a professional social media presence to attract clients",
        ],
        successStories: [
          {
            name: "James Rodriguez",
            background: "Former marketing manager",
            journey: "Started coaching beginners in digital marketing basics",
            outcome:
              "Built to 20 coaching clients at $150/session, working 25 hours/week",
          },
        ],
        resources: [
          {
            title: "Coaching Business Blueprint",
            url: "https://coachingblueprint.com",
          },
          {
            title: "Client Acquisition Strategies",
            url: "https://getcoachingclients.com",
          },
        ],
        skillGapDays: 14,
        matchScore: 0.75,
        timeToFirstRevenue: "2-4 weeks",
        roiScore: 81,
      });

      opportunities.push({
        id: generateId("teachable-course"),
        source: "supplementary",
        title: "Create and Sell Online Courses on Teachable",
        description:
          "Develop and sell comprehensive online courses in your area of expertise. The e-learning market continues to grow, with professionals seeking to upskill through flexible, on-demand education.",
        requiredSkills: ["Expertise in a Subject", "Teaching"],
        niceToHaveSkills: ["Video Production", "Course Design", "Marketing"],
        type: OpportunityType.INFO_PRODUCT,
        estimatedIncome: { min: 2000, max: 15000, timeframe: "month" },
        startupCost: { min: 500, max: 2000 },
        timeRequired: { min: 20, max: 40 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Identify a specialized topic where you have deep knowledge",
          "Create a detailed course outline and learning objectives",
          "Set up a Teachable account and course structure",
          "Record and edit high-quality video lessons",
          "Develop supplementary materials like workbooks and quizzes",
          "Create a marketing funnel to attract students",
        ],
        successStories: [
          {
            name: "Carlos Mendez",
            background: "Software developer specializing in cybersecurity",
            journey:
              "Created a practical course on ethical hacking and security",
            outcome:
              "Course has enrolled 3,800 students with $140K in total revenue over 18 months",
          },
        ],
        resources: [
          {
            title: "Course Creator Pro",
            url: "https://teachable.com/creators/resources",
          },
          {
            title: "E-Learning Production Guide",
            url: "https://courseformula.com",
          },
        ],
        skillGapDays: 21,
        matchScore: 0.8,
        timeToFirstRevenue: "2-3 months",
        roiScore: 85,
      });
    }
  }

  /**
   * Add ecommerce opportunities
   */
  private addEcommerceOpportunities(
    opportunities: RawOpportunity[],
    hasRelevantSkills: boolean,
    generateId: (prefix: string) => string,
  ): void {
    if (hasRelevantSkills) {
      opportunities.push({
        id: generateId("print-demand"),
        source: "supplementary",
        title: "Print-on-Demand Products",
        description:
          "Design and sell custom merchandise without inventory using print-on-demand services. This business model eliminates inventory risk while allowing you to monetize your creativity.",
        requiredSkills: ["Basic Design"],
        niceToHaveSkills: ["Marketing", "Trend Awareness"],
        type: OpportunityType.PASSIVE,
        estimatedIncome: { min: 500, max: 5000, timeframe: "month" },
        startupCost: { min: 0, max: 200 },
        timeRequired: { min: 5, max: 15 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "MEDIUM",
        stepsToStart: [
          "Choose a print-on-demand platform like Printful or Printify",
          "Create designs that appeal to specific niches",
          "Set up an online store with Shopify or Etsy",
          "Market your products on social media platforms",
        ],
        successStories: [
          {
            name: "Taylor Wilson",
            background: "Hobbyist illustrator with full-time job",
            journey: "Created cat-themed merchandise targeting cat lovers",
            outcome:
              "Now earning $3,000/month in mostly passive income from 50+ designs",
          },
        ],
        resources: [
          {
            title: "Print-on-Demand Masterclass",
            url: "https://podprofits.com",
          },
          { title: "Etsy Seller Guide", url: "https://etsy-success.com" },
        ],
        skillGapDays: 7,
        matchScore: 0.7,
        timeToFirstRevenue: "2-3 weeks",
        roiScore: 78,
      });

      opportunities.push({
        id: generateId("shopify-dropshipping"),
        source: "supplementary",
        title: "Shopify Dropshipping Store",
        description:
          "Launch a dropshipping business on Shopify selling products without holding inventory. This model lets you focus on marketing and customer service while suppliers handle fulfillment.",
        requiredSkills: ["Marketing", "Customer Service"],
        niceToHaveSkills: ["Product Research", "Social Media", "Copywriting"],
        type: OpportunityType.DIGITAL_PRODUCT,
        estimatedIncome: { min: 1000, max: 10000, timeframe: "month" },
        startupCost: { min: 500, max: 2000 },
        timeRequired: { min: 15, max: 40 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Research profitable niches and trending products",
          "Set up a Shopify store and install dropshipping apps",
          "Find reliable suppliers on platforms like AliExpress or Spocket",
          "Create compelling product pages with professional photos",
          "Develop a marketing strategy focused on social media and ads",
        ],
        successStories: [
          {
            name: "Ryan Zhang",
            background: "College student with interest in fitness",
            journey:
              "Started dropshipping fitness accessories targeting home gym enthusiasts",
            outcome:
              "Built store to $15,000/month in revenue with 30% profit margin within a year",
          },
        ],
        resources: [
          {
            title: "Dropshipping Masterclass",
            url: "https://dropshiplifestyle.com",
          },
          {
            title: "Shopify Startup Guide",
            url: "https://shopify.com/guides/dropshipping",
          },
        ],
        skillGapDays: 14,
        matchScore: 0.75,
        timeToFirstRevenue: "3-6 weeks",
        roiScore: 80,
      });
    }
  }

  /**
   * Add programming opportunities
   */
  private addProgrammingOpportunities(
    opportunities: RawOpportunity[],
    hasRelevantSkills: boolean,
    generateId: (prefix: string) => string,
  ): void {
    if (hasRelevantSkills) {
      opportunities.push({
        id: generateId("app-development"),
        source: "supplementary",
        title: "Mobile App Development Freelancing",
        description:
          "Create custom mobile applications for businesses and entrepreneurs. Companies of all sizes need mobile apps to engage customers and streamline operations.",
        requiredSkills: ["Programming", "Mobile Development"],
        niceToHaveSkills: ["UI/UX Design", "Backend Development"],
        type: OpportunityType.FREELANCE,
        estimatedIncome: { min: 50, max: 150, timeframe: "hour" },
        startupCost: { min: 0, max: 500 },
        timeRequired: { min: 10, max: 40 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Build a portfolio of sample mobile apps or components",
          "Set up profiles on freelance platforms like Upwork and Toptal",
          "Define your service packages and development process",
          "Create a professional portfolio website",
          "Network with business owners and startups",
        ],
        successStories: [
          {
            name: "Aiden Parker",
            background: "Computer science graduate",
            journey:
              "Started with small app projects while building a portfolio",
            outcome:
              "Now runs a mobile development agency with 6-figure annual revenue",
          },
        ],
        resources: [
          {
            title: "Freelance Developer's Playbook",
            url: "https://freelancedevguide.com",
          },
          {
            title: "Mobile App Architecture Course",
            url: "https://mobilearchitecture.dev",
          },
        ],
        skillGapDays: 14,
        matchScore: 0.85,
        timeToFirstRevenue: "3-6 weeks",
        roiScore: 82,
      });

      opportunities.push({
        id: generateId("saas-product"),
        source: "supplementary",
        title: "Create a Micro-SaaS Product",
        description:
          "Develop a small, niche software-as-a-service product that solves a specific problem for businesses or professionals. Micro-SaaS products require less capital and can be managed by a single founder.",
        requiredSkills: ["Software Development", "Problem Solving"],
        niceToHaveSkills: ["UX Design", "Marketing", "Customer Support"],
        type: OpportunityType.DIGITAL_PRODUCT,
        estimatedIncome: { min: 3000, max: 20000, timeframe: "month" },
        startupCost: { min: 1000, max: 5000 },
        timeRequired: { min: 20, max: 40 },
        entryBarrier: RiskLevel.HIGH,
        marketDemand: "MEDIUM",
        stepsToStart: [
          "Identify a specific, painful problem in an industry you know",
          "Validate your idea by talking to potential customers",
          "Build a minimum viable product (MVP)",
          "Set up payment processing and a simple website",
          "Launch on ProductHunt and relevant communities",
          "Implement a customer feedback loop for continuous improvement",
        ],
        successStories: [
          {
            name: "Sophia Chen",
            background: "Web developer at a marketing agency",
            journey:
              "Created a simple tool to automate social media reporting for agencies",
            outcome:
              "Product now generates $12,000/month in recurring revenue with minimal support",
          },
        ],
        resources: [
          { title: "Zero to Micro-SaaS", url: "https://microsaasbuilder.com" },
          {
            title: "SaaS Pricing Strategies",
            url: "https://saaspricingplaybook.com",
          },
        ],
        skillGapDays: 28,
        matchScore: 0.8,
        timeToFirstRevenue: "3-6 months",
        roiScore: 75,
      });

      opportunities.push({
        id: generateId("automation-tools"),
        source: "supplementary",
        title: "Business Automation Solutions",
        description:
          "Create custom automation scripts and tools for businesses to streamline their workflows and reduce manual tasks. Companies are increasingly looking for ways to automate repetitive processes.",
        requiredSkills: ["Programming", "Process Optimization"],
        niceToHaveSkills: [
          "API Integration",
          "Database Management",
          "Business Analysis",
        ],
        type: OpportunityType.SERVICE,
        estimatedIncome: { min: 75, max: 200, timeframe: "hour" },
        startupCost: { min: 0, max: 300 },
        timeRequired: { min: 10, max: 30 },
        entryBarrier: RiskLevel.MEDIUM,
        marketDemand: "HIGH",
        stepsToStart: [
          "Identify common business processes that can be automated",
          "Learn popular automation platforms like Zapier, Make.com, or custom solutions",
          "Create case studies showing time/money saved through automation",
          "Offer a free workflow assessment to potential clients",
          "Network with business consultants and efficiency experts",
        ],
        successStories: [
          {
            name: "Nathan Rodriguez",
            background: "IT specialist with scripting experience",
            journey:
              "Started automating data entry tasks for a law firm, expanded to other processes",
            outcome:
              "Now specializes in legal industry automation with 12 ongoing clients and $140K annual revenue",
          },
        ],
        resources: [
          {
            title: "Business Process Automation Guide",
            url: "https://automationexperts.co",
          },
          {
            title: "API Integration Masterclass",
            url: "https://apimastery.io",
          },
        ],
        skillGapDays: 7,
        matchScore: 0.88,
        timeToFirstRevenue: "2-4 weeks",
        roiScore: 87,
      });
    }
  }

  /**
   * Add general opportunities that could appeal to most people
   */
  private addGeneralOpportunities(
    opportunities: RawOpportunity[],
    generateId: (prefix: string) => string,
  ): void {
    // Always add a couple of general opportunities that could work for anyone
    if (opportunities.length < 5) {
      opportunities.push({
        id: generateId("online-coaching"),
        source: "supplementary",
        title: "Online Skills Coaching",
        description:
          "Offer one-on-one or group coaching in your area of expertise. Coaching is a high-value service that can be delivered remotely and scales well with your available time.",
        requiredSkills: ["Expertise in a Topic", "Communication"],
        niceToHaveSkills: ["Teaching", "Marketing"],
        type: OpportunityType.SERVICE,
        estimatedIncome: { min: 50, max: 300, timeframe: "hour" },
        startupCost: { min: 0, max: 500 },
        timeRequired: { min: 5, max: 20 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "MEDIUM",
        stepsToStart: [
          "Define your coaching niche and target audience",
          "Create a simple coaching program outline",
          "Set up a booking system for sessions",
          "Create a professional social media presence to attract clients",
        ],
        successStories: [
          {
            name: "James Rodriguez",
            background: "Former marketing manager",
            journey: "Started coaching beginners in digital marketing basics",
            outcome:
              "Built to 20 coaching clients at $150/session, working 25 hours/week",
          },
        ],
        resources: [
          {
            title: "Coaching Business Blueprint",
            url: "https://coachingblueprint.com",
          },
          {
            title: "Client Acquisition Strategies",
            url: "https://getcoachingclients.com",
          },
        ],
        skillGapDays: 14,
        matchScore: 0.75,
        timeToFirstRevenue: "2-4 weeks",
        roiScore: 81,
      });

      opportunities.push({
        id: generateId("print-demand"),
        source: "supplementary",
        title: "Print-on-Demand Products",
        description:
          "Design and sell custom merchandise without inventory using print-on-demand services. This business model eliminates inventory risk while allowing you to monetize your creativity.",
        requiredSkills: ["Basic Design"],
        niceToHaveSkills: ["Marketing", "Trend Awareness"],
        type: OpportunityType.PASSIVE,
        estimatedIncome: { min: 500, max: 5000, timeframe: "month" },
        startupCost: { min: 0, max: 200 },
        timeRequired: { min: 5, max: 15 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: "MEDIUM",
        stepsToStart: [
          "Choose a print-on-demand platform like Printful or Printify",
          "Create designs that appeal to specific niches",
          "Set up an online store with Shopify or Etsy",
          "Market your products on social media platforms",
        ],
        successStories: [
          {
            name: "Taylor Wilson",
            background: "Hobbyist illustrator with full-time job",
            journey: "Created cat-themed merchandise targeting cat lovers",
            outcome:
              "Now earning $3,000/month in mostly passive income from 50+ designs",
          },
        ],
        resources: [
          {
            title: "Print-on-Demand Masterclass",
            url: "https://podprofits.com",
          },
          { title: "Etsy Seller Guide", url: "https://etsy-success.com" },
        ],
        skillGapDays: 7,
        matchScore: 0.7,
        timeToFirstRevenue: "2-3 weeks",
        roiScore: 78,
      });
    }
  }

  /**
   * Get an opportunity by ID - handles both database and dynamically generated opportunities
   */
  async getOpportunityById(
    opportunityId: string,
  ): Promise<RawOpportunity | null> {
    try {
      logger.info(`Looking up opportunity with ID: ${opportunityId}`);

      // First check our local cache
      if (this.opportunityCache.has(opportunityId)) {
        logger.info(`Found opportunity ${opportunityId} in cache`);
        return this.opportunityCache.get(opportunityId)!;
      }

      // If not in cache, check if we have a saved opportunity in the database
      try {
        // Query monetization opportunities table to find matching opportunity
        const savedOpportunities =
          await db.query.monetizationOpportunities.findMany();

        // Look through all saved opportunities for a matching ID
        for (const savedOpp of savedOpportunities) {
          if (
            savedOpp.opportunityData &&
            Array.isArray(savedOpp.opportunityData)
          ) {
            const matchingOpp = savedOpp.opportunityData.find(
              (opp) => opp.id === opportunityId,
            );
            if (matchingOpp) {
              logger.info(`Found opportunity ${opportunityId} in database`);
              // Store in cache for future lookups
              this.opportunityCache.set(opportunityId, {
                ...matchingOpp,
                _cachedAt: Date.now(),
              });
              return matchingOpp;
            }
          }
        }
        logger.info(`Opportunity ${opportunityId} not found in database`);
      } catch (error) {
        logger.error(
          `Error searching database for opportunity: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // If we don't have it cached or in database, try to fetch it from the source
      const parts = opportunityId.split("-");

      if (parts.length >= 2) {
        const sourceId = parts[0];

        // Check if we have this source registered
        const source = this.sources.get(sourceId);
        if (source) {
          logger.info(
            `Found matching source ${sourceId} for opportunity ID ${opportunityId}`,
          );

          try {
            // Try to get the specific opportunity from the source
            const sourceOpportunities = await source.getOpportunities(
              ["general"],
              {
                skills: ["general"],
                timeAvailability: "10-20",
                riskAppetite: "MEDIUM",
                incomeGoals: 1000,
              },
            );

            // Look for an exact match
            const matchingOpp = sourceOpportunities.find(
              (opp) => opp.id === opportunityId,
            );
            if (matchingOpp) {
              logger.info(`Found exact opportunity match for ${opportunityId}`);
              // Cache it for future requests
              this.opportunityCache.set(opportunityId, {
                ...matchingOpp,
                _cachedAt: Date.now(),
              });
              return matchingOpp;
            }

            // No exact match found, create a synthetic opportunity
            logger.info(
              `No exact match found for ${opportunityId}, creating synthetic data`,
            );

            const keywordFromId = parts.slice(1).join("-");
            const syntheticOpportunity: RawOpportunity = {
              id: opportunityId,
              title: `${this.capitalizeFirstLetter(keywordFromId)} Opportunity`,
              description: `This is a ${keywordFromId} opportunity from ${sourceId}.`,
              url: `https://${sourceId}.com/${keywordFromId}`,
              platform: sourceId,
              type: this.mapOpportunityType(keywordFromId),
              requiredSkills: ["communication", keywordFromId],
              estimatedIncome: {
                min: 500,
                max: 3000,
                timeframe: "month",
              },
              startupCost: {
                min: 0,
                max: 200,
              },
              timeRequired: {
                min: 10,
                max: 30,
              },
              entryBarrier: RiskLevel.MEDIUM,
              stepsToStart: [
                `Research ${keywordFromId} opportunities on ${sourceId}`,
                "Create a professional profile",
                "Start applying or creating content",
                "Build your reputation through quality work",
              ],
              resourceLinks: [
                `https://${sourceId}.com/get-started`,
                `https://${sourceId}.com/tips`,
              ],
              successStories: [
                "Jane started with no experience and now makes $2,500/month",
                "Mark turned his hobby into a $3,000/month side hustle",
              ],
              matchScore: 0.85,
            };

            // Cache the synthetic opportunity
            this.opportunityCache.set(opportunityId, {
              ...syntheticOpportunity,
              _cachedAt: Date.now(),
            });
            return syntheticOpportunity;
          } catch (error) {
            logger.error(
              `Error getting opportunities from source ${sourceId}: ${error}`,
            );
          }
        }
      }

      logger.info(`No opportunity found for ID ${opportunityId}`);
      return null;
    } catch (error) {
      logger.error(
        `Error getting opportunity by ID ${opportunityId}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Helper method to map opportunity types
   */
  private mapOpportunityType(keyword: string): OpportunityType {
    keyword = keyword.toLowerCase();

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
}

// Create singleton instance
export const discoveryService = new DiscoveryService();

// Initialize with available sources
// The actual source imports and registration will happen in index.ts
