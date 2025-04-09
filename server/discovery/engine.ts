/**
 * Monetization Discovery Engine
 * Core implementation for discovering personalized monetization opportunities
 */

import { v4 as uuidv4 } from "uuid";
import { 
  UserDiscoveryInput, 
  OpportunitySource, 
  RawOpportunity,
  EnrichedOpportunity,
  DiscoveryResults,
  SuccessStory,
  Resource
} from "./types";
import { logger } from "./utils";

// Constants for the algorithm
const OPPORTUNITY_CATEGORIES = {
  QUICK_WIN: "Quick Win",
  GROWTH: "Growth Opportunity",
  ASPIRATIONAL: "Aspirational Path",
  PASSIVE: "Passive Income Stream"
};

/**
 * Main discovery engine class
 */
export class MonetizationDiscoveryEngine {
  private sources: Map<string, OpportunitySource>;
  private cachedResults: Map<string, DiscoveryResults>;
  
  constructor() {
    this.sources = new Map<string, OpportunitySource>();
    this.cachedResults = new Map<string, DiscoveryResults>();
    
    // Initialize with some default timeout to avoid excess API calls
    this.setupCacheCleanup();
  }
  
  /**
   * Register a new opportunity source
   */
  registerSource(source: OpportunitySource): void {
    this.sources.set(source.id, source);
    logger.info(`Registered source: ${source.name} (${source.id})`);
  }
  
  /**
   * Get all registered sources
   */
  getSources(): OpportunitySource[] {
    return Array.from(this.sources.values()).filter(source => source.active);
  }
  
  /**
   * Main method to discover opportunities based on user input
   */
  async discoverOpportunities(input: UserDiscoveryInput): Promise<DiscoveryResults> {
    const startTime = Date.now();
    const requestId = uuidv4();
    const activeSources = this.getSources();
    
    logger.info(`Starting discovery for user ${input.userId}, requestId: ${requestId}`);
    logger.info(`User skills: ${input.skills.join(', ')}`);
    
    try {
      // 1. Aggregate raw opportunities from all sources
      const rawOpportunities = await this.aggregateOpportunities(activeSources, input);
      logger.info(`Found ${rawOpportunities.length} raw opportunities from ${activeSources.length} sources`);
      
      // 2. Calculate match scores and filter by user preferences
      const scoredOpportunities = this.scoreAndFilterOpportunities(rawOpportunities, input);
      logger.info(`After scoring and filtering: ${scoredOpportunities.length} opportunities`);
      
      // 3. Enrich opportunities with additional data
      const enrichedOpportunities = await this.enrichOpportunities(scoredOpportunities, input);
      logger.info(`Enriched ${enrichedOpportunities.length} opportunities`);
      
      // 4. Categorize opportunities
      const categorizedOpportunities = this.categorizeOpportunities(enrichedOpportunities, input);
      
      // 5. Find similar users (if social features are enabled)
      const similarUsers = input.discoverable 
        ? await this.findSimilarUsers(input) 
        : undefined;
      
      // 6. Create final results
      const results: DiscoveryResults = {
        requestId,
        userId: input.userId,
        timestamp: new Date(),
        userInput: {
          skills: input.skills,
          timeAvailability: input.timeAvailability,
          incomeGoals: input.incomeGoals,
          riskTolerance: input.riskTolerance,
          workPreference: input.workPreference
        },
        opportunities: categorizedOpportunities,
        categories: this.extractCategories(categorizedOpportunities),
        metrics: {
          sourcesSearched: activeSources.length,
          totalOpportunitiesFound: rawOpportunities.length,
          matchThreshold: this.calculateMatchThreshold(input),
          processingTimeMs: Date.now() - startTime
        },
        similarUsers,
        enhanced: !!input.useEnhanced
      };
      
      // Cache results for potential reuse
      this.cachedResults.set(requestId, results);
      
      return results;
    } catch (error) {
      logger.error(`Error during discovery: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Aggregate opportunities from all active sources
   */
  private async aggregateOpportunities(
    sources: OpportunitySource[], 
    input: UserDiscoveryInput
  ): Promise<RawOpportunity[]> {
    // Use Promise.allSettled to handle potential failures from individual sources
    const sourcePromises = sources.map(async source => {
      try {
        const opportunities = await source.fetchOpportunities(input);
        return opportunities;
      } catch (error) {
        logger.error(`Error fetching from source ${source.id}: ${error.message}`);
        return [];
      }
    });
    
    const results = await Promise.allSettled(sourcePromises);
    
    // Flatten the results from all sources
    return results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => (result as PromiseFulfilledResult<RawOpportunity[]>).value);
  }
  
  /**
   * Score opportunities based on match with user skills and preferences
   */
  private scoreAndFilterOpportunities(
    opportunities: RawOpportunity[],
    input: UserDiscoveryInput
  ): RawOpportunity[] {
    // Filter by work preference
    const filteredByPreference = opportunities.filter(opp => {
      if (input.workPreference === 'both') return true;
      return opp.location === input.workPreference || opp.location === 'both';
    });
    
    // Calculate skill match
    const matchThreshold = this.calculateMatchThreshold(input);
    
    // Score and filter
    return filteredByPreference
      .map(opp => ({
        ...opp,
        matchScore: this.calculateMatchScore(opp.skillsRequired, input.skills)
      }))
      .filter(opp => opp.matchScore >= matchThreshold);
  }
  
  /**
   * Calculate match score between opportunity skills and user skills
   */
  private calculateMatchScore(requiredSkills: string[], userSkills: string[]): number {
    if (!requiredSkills.length) return 0;
    
    const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase());
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase());
    
    // Find direct matches
    const matchedSkills = normalizedUserSkills.filter(skill => 
      normalizedRequiredSkills.includes(skill));
    
    // Find partial matches
    const partialMatches = normalizedUserSkills.filter(skill => 
      !matchedSkills.includes(skill) && 
      normalizedRequiredSkills.some(reqSkill => 
        reqSkill.includes(skill) || skill.includes(reqSkill)));
    
    // Calculate score
    const directMatchScore = (matchedSkills.length / normalizedRequiredSkills.length) * 80;
    const partialMatchScore = (partialMatches.length / normalizedRequiredSkills.length) * 20;
    
    return Math.min(100, directMatchScore + partialMatchScore);
  }
  
  /**
   * Determine match threshold based on user preferences
   */
  private calculateMatchThreshold(input: UserDiscoveryInput): number {
    // More risk-tolerant users see more opportunities with lower match scores
    switch (input.riskTolerance) {
      case 'high': return 30;
      case 'medium': return 50;
      case 'low': return 70;
      default: return 50;
    }
  }
  
  /**
   * Enrich opportunities with additional contextual data
   */
  private async enrichOpportunities(
    opportunities: (RawOpportunity & { matchScore: number })[],
    input: UserDiscoveryInput
  ): Promise<EnrichedOpportunity[]> {
    return Promise.all(opportunities.map(async opp => {
      // Calculate skill match details
      const skillMatchDetails = this.analyzeSkillMatch(opp.skillsRequired, input.skills);
      
      // Fetch success stories (would connect to DB or API in production)
      const successStories = await this.getSuccessStories(opp, input);
      
      // Generate steps to start
      const stepsToStart = this.generateStepsToStart(opp);
      
      // Find relevant resources
      const resources = await this.findRelevantResources(opp, input);
      
      // Calculate time to first dollar
      const timeToFirstDollar = this.estimateTimeToFirstDollar(opp, skillMatchDetails);
      
      // Find skill gap resources if needed
      const skillGapResources = skillMatchDetails.missing.length > 0 
        ? await this.findSkillGapResources(skillMatchDetails.missing)
        : undefined;
      
      return {
        ...opp,
        id: uuidv4(),
        matchScore: opp.matchScore,
        skillMatchDetails,
        successStories,
        stepsToStart,
        resources,
        skillGapResources,
        timeToFirstDollar,
        categories: {
          primary: this.determineCategory(opp, input)
        }
      };
    }));
  }
  
  /**
   * Analyze skill match between opportunity and user
   */
  private analyzeSkillMatch(requiredSkills: string[], userSkills: string[]) {
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase());
    const normalizedUser = userSkills.map(s => s.toLowerCase());
    
    // Find direct matches
    const matched = normalizedUser.filter(skill => 
      normalizedRequired.includes(skill));
    
    // Find missing skills
    const missing = normalizedRequired.filter(skill => 
      !normalizedUser.some(userSkill => 
        userSkill === skill || userSkill.includes(skill) || skill.includes(userSkill)));
    
    // Find related skills
    const related = this.findRelatedSkills(normalizedRequired, normalizedUser);
    
    return {
      matched,
      missing,
      related
    };
  }
  
  /**
   * Find related skills that might be helpful but not required
   */
  private findRelatedSkills(requiredSkills: string[], userSkills: string[]): string[] {
    // This is a simplified implementation
    // In production, this would connect to a skill graph or use ML
    
    // Example skill relationships (in production would be from a database)
    const relatedSkillsMap: Record<string, string[]> = {
      'javascript': ['typescript', 'react', 'node.js', 'front-end development'],
      'writing': ['copywriting', 'content creation', 'blogging', 'editing'],
      'design': ['ui design', 'graphic design', 'ux design', 'illustration'],
      // and so on...
    };
    
    const result = new Set<string>();
    
    // For each required skill, find related skills the user might have
    for (const skill of requiredSkills) {
      const related = relatedSkillsMap[skill] || [];
      for (const relSkill of related) {
        if (!userSkills.includes(relSkill) && !requiredSkills.includes(relSkill)) {
          result.add(relSkill);
        }
      }
    }
    
    return Array.from(result);
  }
  
  /**
   * Get success stories for an opportunity
   */
  private async getSuccessStories(
    opportunity: RawOpportunity,
    input: UserDiscoveryInput
  ): Promise<SuccessStory[]> {
    // In production, this would fetch from a database or API
    // For now, we'll return placeholders
    
    // Example stories (would be from a database)
    const exampleStories: SuccessStory[] = [
      {
        name: "Sarah Johnson",
        background: "Former marketing manager who wanted more flexibility",
        journey: "Started with small projects on weekends, built portfolio over 3 months",
        outcome: "Now runs a 6-figure freelance business with a team of 3",
        timeframe: "1 year to full-time income",
        income: "$8,500/month average"
      },
      {
        name: "Michael Chen",
        background: "Computer science student looking for side income",
        journey: "Created digital products while still in school, marketed through Twitter",
        outcome: "Graduated with a passive income stream already established",
        timeframe: "6 months to first $1,000 month",
        income: "$3,000-5,000/month passive"
      }
    ];
    
    // Filter to return 1-2 relevant stories
    return exampleStories.slice(0, opportunity.type === 'PASSIVE' ? 1 : 2);
  }
  
  /**
   * Generate steps to start for an opportunity
   */
  private generateStepsToStart(opportunity: RawOpportunity): string[] {
    // In production, these would be customized based on the specific opportunity
    // and potentially use a template system or AI generation
    
    switch (opportunity.type) {
      case 'FREELANCE':
        return [
          "Create a professional profile on the platform",
          "Complete all verification steps to boost visibility",
          "Set up a portfolio showcasing relevant work",
          "Research market rates and set competitive pricing",
          "Apply to 10-15 opportunities that match your skills",
          "Follow up with potential clients within 24 hours"
        ];
      case 'DIGITAL_PRODUCT':
        return [
          "Research successful products in your niche",
          "Create a minimum viable product (MVP)",
          "Set up a creator account on the platform",
          "Design an appealing product page with clear benefits",
          "Set up payment processing",
          "Develop a simple marketing plan for launch"
        ];
      case 'CONTENT':
        return [
          "Define your content niche and target audience",
          "Create 3-5 high-quality sample pieces",
          "Set up your creator profile with professional photo",
          "Develop a content calendar for first month",
          "Publish consistently for 30 days",
          "Engage with audience and analyze performance"
        ];
      case 'SERVICE':
        return [
          "Define the exact service package(s) you'll offer",
          "Research competitors to identify your unique value",
          "Create a professional service description",
          "Set up client onboarding process",
          "Create templates for common client requests",
          "Set up a simple booking/scheduling system"
        ];
      case 'PASSIVE':
        return [
          "Research successful passive income products in your field",
          "Create an outline or prototype",
          "Develop a production timeline",
          "Build a landing page to gauge interest",
          "Set up analytics to track visitor behavior",
          "Develop your product based on feedback",
          "Create marketing assets for launch"
        ];
      default:
        return [
          "Research the opportunity thoroughly",
          "Create a specific action plan",
          "Set up necessary accounts and profiles",
          "Complete required verification steps",
          "Create initial content or offerings",
          "Track results and iterate based on feedback"
        ];
    }
  }
  
  /**
   * Find relevant resources for an opportunity
   */
  private async findRelevantResources(
    opportunity: RawOpportunity,
    input: UserDiscoveryInput
  ): Promise<Resource[]> {
    // In production, this would query a database of resources
    // For now, we'll return placeholder resources
    
    // Example resources (would be from a database)
    const resources: Resource[] = [
      {
        title: "Ultimate Guide to Getting Started on " + opportunity.sourceName,
        url: "https://example.com/guide",
        type: "article",
        free: true,
        source: "Creator Academy",
        description: "A comprehensive guide for new creators"
      },
      {
        title: "How to Price Your Services for Maximum Profit",
        url: "https://example.com/pricing",
        type: "video",
        free: true,
        duration: "45 minutes",
        source: "Expert Channel"
      },
      {
        title: "Client Acquisition Masterclass",
        url: "https://example.com/clients",
        type: "course",
        free: false,
        cost: 99,
        duration: "3 weeks",
        source: "Professional Academy"
      }
    ];
    
    // Return relevant resources (would be filtered based on opportunity type)
    return resources.slice(0, 3);
  }
  
  /**
   * Find resources for skill gaps
   */
  private async findSkillGapResources(missingSkills: string[]): Promise<Resource[]> {
    // In production, this would query a learning resource database
    // For now, we'll return placeholder resources
    
    return missingSkills.slice(0, 2).map(skill => ({
      title: `Learn ${skill} - Complete Beginner's Guide`,
      url: `https://example.com/learn/${skill.replace(/\s+/g, '-')}`,
      type: "course",
      free: true,
      duration: "2 weeks",
      source: "Learning Platform",
      description: `Everything you need to get started with ${skill}`
    }));
  }
  
  /**
   * Estimate time to first dollar for an opportunity
   */
  private estimateTimeToFirstDollar(
    opportunity: RawOpportunity,
    skillMatch: { matched: string[], missing: string[], related: string[] }
  ): number {
    // Base time by opportunity type (in days)
    const baseTime: Record<string, number> = {
      'FREELANCE': 14,
      'DIGITAL_PRODUCT': 60,
      'CONTENT': 30,
      'SERVICE': 21,
      'PASSIVE': 90,
      'INFO_PRODUCT': 45
    };
    
    // Adjust based on various factors
    let time = baseTime[opportunity.type] || 30;
    
    // Adjust for skill match
    const skillMatchPercentage = skillMatch.matched.length / 
      (skillMatch.matched.length + skillMatch.missing.length);
    
    // Reduce time for high skill match, increase for low match
    if (skillMatchPercentage > 0.8) {
      time *= 0.7; // 30% faster if skills match well
    } else if (skillMatchPercentage < 0.5) {
      time *= 1.5; // 50% slower if many skills missing
    }
    
    // Adjust for competition
    if (opportunity.competition === 'high') {
      time *= 1.3; // 30% longer in highly competitive areas
    } else if (opportunity.competition === 'low') {
      time *= 0.8; // 20% faster in low competition areas
    }
    
    // Adjust for entry barrier
    if (opportunity.entryBarrier === 'HIGH') {
      time *= 1.4; // 40% longer for high entry barriers
    } else if (opportunity.entryBarrier === 'LOW') {
      time *= 0.7; // 30% faster for low entry barriers
    }
    
    return Math.round(time);
  }
  
  /**
   * Determine the primary category for an opportunity
   */
  private determineCategory(
    opportunity: RawOpportunity & { matchScore: number },
    input: UserDiscoveryInput
  ): string {
    // Quick Win: High match score, low entry barrier, fast time to first dollar
    if (opportunity.matchScore > 80 && opportunity.entryBarrier === 'LOW') {
      return OPPORTUNITY_CATEGORIES.QUICK_WIN;
    }
    
    // Passive Income: Passive opportunity type
    if (opportunity.type === 'PASSIVE' || opportunity.type === 'DIGITAL_PRODUCT') {
      return OPPORTUNITY_CATEGORIES.PASSIVE;
    }
    
    // Aspirational: High income potential but high barrier or low match
    if (
      opportunity.estimatedIncome.max > input.incomeGoals * 2 && 
      (opportunity.entryBarrier === 'HIGH' || opportunity.matchScore < 60)
    ) {
      return OPPORTUNITY_CATEGORIES.ASPIRATIONAL;
    }
    
    // Default to Growth Opportunity
    return OPPORTUNITY_CATEGORIES.GROWTH;
  }
  
  /**
   * Categorize opportunities into strategic groups
   */
  private categorizeOpportunities(
    opportunities: EnrichedOpportunity[],
    input: UserDiscoveryInput
  ): EnrichedOpportunity[] {
    // Sort opportunities based on user preferences
    return opportunities.sort((a, b) => {
      // First prioritize by category
      const categoryOrder = [
        OPPORTUNITY_CATEGORIES.QUICK_WIN,
        OPPORTUNITY_CATEGORIES.GROWTH,
        OPPORTUNITY_CATEGORIES.PASSIVE,
        OPPORTUNITY_CATEGORIES.ASPIRATIONAL
      ];
      
      const categoryDiff = 
        categoryOrder.indexOf(a.categories.primary) - 
        categoryOrder.indexOf(b.categories.primary);
      
      if (categoryDiff !== 0) return categoryDiff;
      
      // Then by match score
      const scoreDiff = b.matchScore - a.matchScore;
      if (Math.abs(scoreDiff) > 10) return scoreDiff;
      
      // Then by income potential (adjusted for timeframe)
      const aIncome = this.normalizeIncome(a.estimatedIncome);
      const bIncome = this.normalizeIncome(b.estimatedIncome);
      
      return bIncome - aIncome;
    });
  }
  
  /**
   * Normalize income to monthly for comparison
   */
  private normalizeIncome(income: { min: number, max: number, timeframe: string }): number {
    const avg = (income.min + income.max) / 2;
    
    switch (income.timeframe) {
      case 'hourly': return avg * 20 * 4; // Assume 20 hours/week, 4 weeks/month
      case 'per-project': return avg * 2; // Assume 2 projects per month
      case 'annual': return avg / 12;
      default: return avg; // monthly
    }
  }
  
  /**
   * Extract categories for the results
   */
  private extractCategories(opportunities: EnrichedOpportunity[]): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    
    for (const opp of opportunities) {
      const category = opp.categories.primary;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(opp.id);
    }
    
    return categories;
  }
  
  /**
   * Find similar users based on skills
   */
  private async findSimilarUsers(input: UserDiscoveryInput) {
    // In production, this would query the database
    // For now, we'll return placeholder data
    
    // This would be implemented in storage.ts to search user profiles
    return [];
  }
  
  /**
   * Set up cache cleanup to avoid memory leaks
   */
  private setupCacheCleanup() {
    // Clear cache every 24 hours
    setInterval(() => {
      const now = Date.now();
      for (const [key, result] of this.cachedResults.entries()) {
        // Remove results older than 24 hours
        if (now - result.timestamp.getTime() > 24 * 60 * 60 * 1000) {
          this.cachedResults.delete(key);
        }
      }
    }, 60 * 60 * 1000); // Check every hour
  }
}