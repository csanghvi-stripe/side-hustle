/**
 * Discovery Service
 * 
 * This service acts as the facade to the discovery engine, managing the registration
 * and coordination of various opportunity sources.
 */

import { DiscoveryPreferences, DiscoveryResults, OpportunitySource, RawOpportunity, SimilarUser, CacheEntry } from './types';
import { RiskLevel, OpportunityType } from '../../shared/schema';
import { db } from '../db';
import { logger } from './utils';
import { monetizationOpportunities, users, userProfiles } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { MLEngine } from './ml-engine';
import { SkillGapAnalyzer } from './skill-gap-analyzer';
import { anthropicHelper } from './anthropic-helper';

// Source Manager
class DiscoveryService {
  private sources: Map<string, OpportunitySource> = new Map();
  private sourceTimeout = 30000; // 30 seconds timeout for sources
  private resultCache: Map<string, DiscoveryResults> = new Map();
  private opportunityCache: Map<string, RawOpportunity> = new Map();
  private cacheExpirationMs = 30 * 60 * 1000; // 30 minutes cache expiration
  private mlEngine = new MLEngine();
  private skillGapAnalyzer = new SkillGapAnalyzer();
  
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
          logger.error(`Error fetching from source ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
          // Continue with other sources even if one fails
        }
      }
      
      // Filter and sort the opportunities based on user preferences
      const filteredResults = await this.filterAndScoreOpportunities(
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
        logger.error(`Error saving discovery results: ${error instanceof Error ? error.message : String(error)}`);
        // Continue even if saving fails
      }
      
      return {
        opportunities: filteredResults,
        similarUsers,
        enhanced: preferences.useEnhanced ?? false,
        mlEnabled: preferences.useML ?? false,
        skillGapAnalysisEnabled: preferences.useSkillGapAnalysis ?? false
      };
    } catch (error) {
      logger.error(`Error in discovery service: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Find similar users based on skill matching
   */
  private async findSimilarUsers(userId: number, skills: string[]): Promise<SimilarUser[]> {
    if (!skills.length) return [];
    
    try {
      // Find all users to check for those with similar skills
      const allUsers = await db.query.users.findMany();
      logger.info(`Found ${allUsers.length} total users to analyze for similarity`);
      
      // Filter out the requesting user
      const otherUsers = allUsers.filter(u => u.id !== userId);
      logger.info(`Found ${otherUsers.length} other users to check for similarity`);
      
      // Get each user's profile to access their skills
      const similarUsers: SimilarUser[] = [];
      
      for (const user of otherUsers) {
        try {
          // Get user profile with skills
          const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, user.id)
          });
          
          if (!profile || !profile.skills) {
            logger.debug(`User ${user.id} has no profile or skills`);
            continue;
          }
          
          // Calculate skill overlap
          const userSkills = Array.isArray(profile.skills) 
            ? profile.skills as string[] 
            : [];
          
          const commonSkills = skills.filter(skill => 
            userSkills.some(userSkill => 
              userSkill.toLowerCase() === skill.toLowerCase()
            )
          );
          
          logger.debug(`User ${user.id} has ${commonSkills.length} common skills out of ${userSkills.length} total skills`);
          
          if (commonSkills.length > 0) {
            // Calculate similarity score (0-1)
            const similarity = commonSkills.length / Math.max(skills.length, userSkills.length);
            
            // Count shared opportunities
            const sharedOpps = await db.query.monetizationOpportunities.findMany({
              where: and(
                eq(monetizationOpportunities.userId, user.id),
                eq(monetizationOpportunities.shared, true)
              )
            });
            
            logger.debug(`User ${user.id} has ${sharedOpps.length} shared opportunities`);
            
            similarUsers.push({
              id: user.id,
              username: user.username,
              skills: userSkills,
              similarity,
              sharedOpportunities: sharedOpps.length
            });
          }
        } catch (err) {
          const error = err as Error;
          logger.error(`Error processing user ${user.id} for similarity: ${error.message}`);
        }
      }
      
      // Sort by similarity (highest first)
      const result = similarUsers.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
      logger.info(`Found ${result.length} similar users`);
      return result;
    } catch (error) {
      logger.error(`Error finding similar users: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Filter and score opportunities based on user preferences 
   * Returns opportunities scored and categorized by relevance
   */
  private async filterAndScoreOpportunities(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
    previousOpportunities: any[]
  ): Promise<RawOpportunity[]> {
    logger.info(`Filtering and scoring ${opportunities.length} opportunities`);
    
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
    
    // ALWAYS add supplementary opportunities to ensure variety and inspiration
    logger.info(`Adding supplementary opportunities to ensure variety and inspirational content`);
    
    // Add diverse opportunities regardless of the current count to ensure variety
    await this.addSupplementaryOpportunities(uniqueOpportunities, preferences);
    
    // Enhanced filtering based on preferences, but ensure diversity
    const filteredOpportunities = uniqueOpportunities.filter(opp => {
      // Filter by time requirement if specified, but more leniently
      if (preferences.timeAvailability !== 'any') {
        const maxHoursPerWeek = this.parseTimeAvailability(preferences.timeAvailability);
        // We'll allow up to 25% more time than user specified to ensure variety
        const adjustedMaxHours = maxHoursPerWeek * 1.25;
        if (opp.timeRequired && opp.timeRequired.min > adjustedMaxHours) {
          return false;
        }
      }
      
      // Filter by risk tolerance if specified, with some flexibility
      if (preferences.riskAppetite !== 'any') {
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
          opp.estimatedIncome.timeframe
        );
        
        // Be more inclusive - keep opportunities that can meet at least 15% of income goals
        if (monthlyIncomeMin < (preferences.incomeGoals * 0.15)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Choose scoring method based on preferences
    let scoredOpportunities: RawOpportunity[];
    
    // Use ML Engine if enabled
    if (preferences.useML) {
      logger.info(`Using ML Engine for opportunity scoring`);
      
      // Use ML engine to score and rank opportunities
      scoredOpportunities = this.mlEngine.predictBestOpportunities(
        filteredOpportunities,
        preferences,
        preferences.userId
      );
      
      // Apply ROI prioritization if enabled
      if (preferences.includeROI) {
        logger.info(`Applying ROI prioritization`);
        // ROI prioritization is already integrated into the ML engine
      }
    } else {
      // Use classic scoring algorithm
      logger.info(`Using classic scoring algorithm`);
      
      scoredOpportunities = filteredOpportunities.map(opp => {
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
      scoredOpportunities.sort((a, b) => 
        (b.matchScore || 0) - (a.matchScore || 0)
      );
    }
    
    // Apply skill gap analysis if enabled
    if (preferences.useSkillGapAnalysis) {
      logger.info(`Applying skill gap analysis to top opportunities`);
      
      // We'll apply skill gap analysis to the top 15 opportunities for performance reasons
      const topOpportunities = scoredOpportunities.slice(0, 15);
      
      // Enhance opportunities with skill gap analysis
      topOpportunities.forEach(opportunity => {
        try {
          // Analyze skill gap
          const skillAnalysis = this.skillGapAnalyzer.analyzeSkillGap(
            preferences.skills,
            opportunity
          );
          
          // Enhance opportunity with skill gap information
          (opportunity as any).skillGapAnalysis = skillAnalysis;
        } catch (error) {
          logger.error(`Error analyzing skill gap: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      
      // Return enhanced opportunities
      return topOpportunities;
    }
    
    // Ensure we return a diverse set of opportunities
    // 1. Group opportunities by type for better category distribution
    const opportunitiesByType: Record<string, RawOpportunity[]> = {};
    
    scoredOpportunities.forEach(opp => {
      const type = opp.type.toString();
      if (!opportunitiesByType[type]) {
        opportunitiesByType[type] = [];
      }
      opportunitiesByType[type].push(opp);
    });
    
    // 2. Create a balanced selection of opportunities across types
    const diverseOpportunities: RawOpportunity[] = [];
    
    // Get top 5 from each category (if available)
    Object.values(opportunitiesByType).forEach(opps => {
      // Take top 5 from each type to show more diverse opportunities
      diverseOpportunities.push(...opps.slice(0, 5));
    });
    
    // 3. Add any remaining top opportunities until we reach 15-20 opportunities total
    const remainingCount = Math.max(0, 20 - diverseOpportunities.length);
    if (remainingCount > 0) {
      // Get opportunities not already included
      const alreadyIncludedIds = new Set(diverseOpportunities.map(o => o.id));
      const remainingOpps = scoredOpportunities.filter(o => !alreadyIncludedIds.has(o.id));
      
      // Add top remaining opportunities
      diverseOpportunities.push(...remainingOpps.slice(0, remainingCount));
    }
    
    // 4. Sort the diverse set by score
    diverseOpportunities.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    
    // Cache all opportunities for future lookups
    scoredOpportunities.forEach(opp => {
      if (opp.id && !this.opportunityCache.has(opp.id)) {
        this.opportunityCache.set(opp.id, opp);
      }
    });

    // Include all opportunities in our cache, not just the ones we're returning
    diverseOpportunities.forEach(opp => {
      if (opp.id && !this.opportunityCache.has(opp.id)) {
        this.opportunityCache.set(opp.id, opp);
      }
    });
    
    // Return the diverse set of opportunities (up to 20)
    logger.info(`Returning ${diverseOpportunities.length} diverse opportunities (cached ${scoredOpportunities.length} total)`);
    return diverseOpportunities;
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
      logger.info('Using Anthropic AI to generate enhanced opportunity suggestions');
      
      try {
        // Generate 5 thoughtful opportunities using Anthropic AI
        const anthropicOpportunities = await anthropicHelper.generateOpportunities(preferences, 5);
        
        if (anthropicOpportunities && anthropicOpportunities.length > 0) {
          logger.info(`Successfully added ${anthropicOpportunities.length} AI-generated opportunities`);
          opportunities.push(...anthropicOpportunities);
          
          // If we got AI-generated opportunities, we can return early
          // as these are typically higher quality than the hardcoded ones
          return;
        }
      } catch (error) {
        logger.error(`Error generating opportunities with Anthropic AI: ${error instanceof Error ? error.message : String(error)}`);
        logger.info('Falling back to standard supplementary opportunities');
      }
    }
    
    // Get any skills that are related to web design/development
    const hasWebSkills = preferences.skills.some(skill => 
      skill.toLowerCase().includes('web') || 
      skill.toLowerCase().includes('design') || 
      skill.toLowerCase().includes('html') || 
      skill.toLowerCase().includes('css') ||
      skill.toLowerCase().includes('javascript')
    );
    
    // Get any skills that are related to writing/content
    const hasWritingSkills = preferences.skills.some(skill => 
      skill.toLowerCase().includes('writ') || 
      skill.toLowerCase().includes('blog') || 
      skill.toLowerCase().includes('content') ||
      skill.toLowerCase().includes('edit')
    );
    
    // Get any skills that are related to graphic design
    const hasDesignSkills = preferences.skills.some(skill => 
      skill.toLowerCase().includes('design') || 
      skill.toLowerCase().includes('graphic') || 
      skill.toLowerCase().includes('illust') ||
      skill.toLowerCase().includes('photo')
    );
    
    // Check for marketing/business skills
    const hasMarketingSkills = preferences.skills.some(skill => 
      skill.toLowerCase().includes('market') || 
      skill.toLowerCase().includes('seo') || 
      skill.toLowerCase().includes('social media') ||
      skill.toLowerCase().includes('advertis') ||
      skill.toLowerCase().includes('sales')
    );
    
    // Check for teaching/coaching skills
    const hasTeachingSkills = preferences.skills.some(skill => 
      skill.toLowerCase().includes('teach') || 
      skill.toLowerCase().includes('coach') || 
      skill.toLowerCase().includes('mentor') ||
      skill.toLowerCase().includes('train') ||
      skill.toLowerCase().includes('educat')
    );
    
    // Check for product/ecommerce skills
    const hasEcommerceSkills = preferences.skills.some(skill => 
      skill.toLowerCase().includes('ecommerce') || 
      skill.toLowerCase().includes('product') || 
      skill.toLowerCase().includes('retail') ||
      skill.toLowerCase().includes('shop') ||
      skill.toLowerCase().includes('merch')
    );
    
    // Generate unique IDs for our supplementary opportunities
    const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Add supplementary opportunities based on detected skills
    if (hasWebSkills) {
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
    
    if (hasWritingSkills) {
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
        id: generateId('newsletter'),
        source: 'supplementary',
        title: 'Paid Newsletter Subscription',
        description: 'Launch a specialized newsletter for professionals in your niche. Email newsletters are making a comeback as people seek curated content from trusted sources.',
        requiredSkills: ['Writing', 'Content Curation'],
        niceToHaveSkills: ['Marketing', 'Subject Expertise'],
        type: OpportunityType.CONTENT,
        estimatedIncome: { min: 1000, max: 5000, timeframe: 'month' },
        startupCost: { min: 0, max: 500 },
        timeRequired: { min: 5, max: 15 },
        entryBarrier: RiskLevel.LOW,
        marketDemand: 'MEDIUM',
        stepsToStart: [
          'Choose a specific niche where you have expertise',
          'Set up on a platform like Substack or Revue',
          'Create a content calendar and consistent publishing schedule',
          'Offer both free and premium content tiers'
        ],
        successStories: [
          {
            name: 'Emily Chen',
            background: 'Former tech journalist',
            journey: 'Started a weekly newsletter about AI and ethics',
            outcome: 'Has 2,500 paid subscribers at $8/month ($20K monthly revenue)'
          }
        ],
        resources: [
          { title: "Newsletter Business Guide", url: "https://substackpro.com" },
          { title: "Building an Audience Course", url: "https://audiencegrowth.com" }
        ],
        skillGapDays: 7,
        matchScore: 0.82,
        timeToFirstRevenue: "1-2 months",
        roiScore: 79
      });
    }
    
    if (hasDesignSkills) {
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
    
    // Add some general opportunities that could appeal to most people
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
    
    // Add Medium-specific content opportunities
    if (hasWritingSkills) {
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
    
    // Add Shopify-specific ecommerce opportunities
    if (hasEcommerceSkills || hasMarketingSkills) {
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
    
    // Add AI-assisted content creation opportunities
    if (hasWritingSkills || hasMarketingSkills) {
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
    
    // Add teaching/course opportunities on specialized platforms
    if (hasTeachingSkills) {
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
    
    logger.info(`Added ${opportunities.length} supplementary opportunities`);
  }
  
  /**
   * Get an opportunity by ID - handles both database and dynamically generated opportunities
   */
  async getOpportunityById(opportunityId: string): Promise<RawOpportunity | null> {
    try {
      logger.info(`Looking up opportunity with ID: ${opportunityId}`);
      
      // First check our local cache
      if (this.opportunityCache.has(opportunityId)) {
        logger.info(`Found opportunity ${opportunityId} in cache`);
        return this.opportunityCache.get(opportunityId)!;
      }
      
      // If not in cache, check if we have a saved opportunity in the database
      try {
        // We need to search all user opportunities in the database
        const savedOpportunities = await db.query.monetizationOpportunities.findMany();
        
        // Look through all saved opportunities for a matching ID
        for (const savedOpp of savedOpportunities) {
          if (savedOpp.opportunityData && Array.isArray(savedOpp.opportunityData)) {
            const matchingOpp = savedOpp.opportunityData.find(opp => opp.id === opportunityId);
            if (matchingOpp) {
              logger.info(`Found opportunity ${opportunityId} in database`);
              // Store in cache for future lookups
              this.opportunityCache.set(opportunityId, matchingOpp);
              return matchingOpp;
            }
          }
        }
        logger.info(`Opportunity ${opportunityId} not found in database`);
      } catch (error) {
        logger.error(`Error searching database for opportunity: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // If we don't have it cached, construct an opportunity with the ID pattern
      // Examples: 'podia-downloads-1744229477449-28' or 'upwork-social-media-12345'
      const parts = opportunityId.split('-');
      
      if (parts.length >= 2) {
        const sourceId = parts[0];
        const opportunities: RawOpportunity[] = [];
        
        // Search through all of our sources
        for (const source of this.sources.values()) {
          if (source.id === sourceId) {
            logger.info(`Found matching source ${sourceId} for opportunity ID ${opportunityId}`);
            
            // Try to get opportunities from this source based on user's skills
            // This is a fallback approach since we don't have the actual opportunity in our cache
            try {
              const sourceOpportunities = await source.getOpportunities(["general"], {
                skills: ["general"],
                timeAvailability: "10-20",
                riskAppetite: "MEDIUM",
                incomeGoals: 1000
              });
              
              for (const opp of sourceOpportunities) {
                // Check if any opportunity matches our ID format
                if (opp.id === opportunityId) {
                  logger.info(`Found exact opportunity match for ${opportunityId}`);
                  // Cache it for future requests
                  this.opportunityCache.set(opportunityId, opp);
                  return opp;
                }
              }
              
              // No exact match found
              logger.info(`No exact match found for ${opportunityId}, using synthetic data`);
              
              // Create a synthetic opportunity based on the ID
              const syntheticOpportunity: RawOpportunity = {
                id: opportunityId,
                title: `${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)} Opportunity`,
                description: `This is a ${parts[1]} opportunity from ${parts[0]}.`,
                url: `https://${parts[0]}.com/${parts[1]}`,
                platform: parts[0],
                type: this.mapOpportunityType(parts[1]),
                requiredSkills: ["communication", parts[1]],
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
                  `Research ${parts[1]} opportunities on ${parts[0]}`,
                  "Create a professional profile",
                  "Start applying or creating content",
                  "Build your reputation through quality work"
                ],
                resourceLinks: [
                  `https://${parts[0]}.com/get-started`,
                  `https://${parts[0]}.com/tips`
                ],
                successStories: [
                  "Jane started with no experience and now makes $2,500/month",
                  "Mark turned his hobby into a $3,000/month side hustle"
                ],
                matchScore: 0.85
              };
              
              // Cache it for future requests
              this.opportunityCache.set(opportunityId, syntheticOpportunity);
              return syntheticOpportunity;
            } catch (error) {
              logger.error(`Error getting opportunities from source ${sourceId}: ${error}`);
            }
          }
        }
      }
      
      logger.info(`No opportunity found for ID ${opportunityId}`);
      return null;
    } catch (error) {
      logger.error(`Error getting opportunity by ID ${opportunityId}: ${error}`);
      return null;
    }
  }
  
  /**
   * Helper method to map opportunity types
   */
  private mapOpportunityType(keyword: string): OpportunityType {
    keyword = keyword.toLowerCase();
    
    if (keyword.includes('freelance') || keyword.includes('consult')) {
      return OpportunityType.FREELANCE;
    } else if (keyword.includes('product') || keyword.includes('download') || keyword.includes('app')) {
      return OpportunityType.DIGITAL_PRODUCT;
    } else if (keyword.includes('content') || keyword.includes('write') || keyword.includes('blog')) {
      return OpportunityType.CONTENT;
    } else if (keyword.includes('service') || keyword.includes('coach')) {
      return OpportunityType.SERVICE;
    } else if (keyword.includes('passive') || keyword.includes('royalty')) {
      return OpportunityType.PASSIVE;
    } else if (keyword.includes('course') || keyword.includes('teach')) {
      return OpportunityType.INFO_PRODUCT;
    }
    
    // Default to FREELANCE if no match
    return OpportunityType.FREELANCE;
  }
}

// Create singleton instance
export const discoveryService = new DiscoveryService();

// Initialize with available sources
// The actual source imports and registration will happen in index.ts