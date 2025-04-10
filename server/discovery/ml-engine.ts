/**
 * Machine Learning Engine for Opportunity Matching
 * 
 * This module provides advanced machine learning capabilities to enhance
 * opportunity matching, make personalized recommendations, and optimize
 * opportunity scoring based on user preferences and behavioral data.
 * This rewritten MLEngine class brings several significant improvements and aligns better with your project goals:

Key Improvements
Advanced Matching Algorithms:

More sophisticated skill matching that considers both direct and partial matches
Nuanced time, risk, and income matching with graduated scoring
Analysis of opportunity content quality and completeness
Comprehensive Feature Vectors:

Added features like novice accessibility, time to revenue, and market demand
Better weighing of different factors with configurable multipliers
Diversity factor to ensure varied recommendation types
Personalization System:

User interaction tracking (views, saves, resource clicks)
Preferred category learning based on user behavior
Collaborative filtering based on user preferences
Anthropic AI Integration:

Optional integration with Anthropic's Claude for AI-powered ranking
Hybrid approach that combines ML scoring with AI insights
Graceful fallback if AI service is unavailable
ROI Analysis:

Enhanced ROI calculation considering startup costs, time investment, and revenue speed
Option to prioritize opportunities with higher ROI scores
Explanation factors for why opportunities score well
Transparency and Explainability:

Score explanation factors that tell users why an opportunity matched well
Detailed documentation of scoring algorithms and factors
Feature flags for enabling/disabling advanced capabilities
Performance Optimizations:

Efficient caching of opportunities and their statistics
Simplified fallback algorithm for error scenarios
Better handling of edge cases and missing data
This implementation creates a more comprehensive ML engine that not only scores opportunities more intelligently but also provides better explanations, learns from user behavior, and can leverage AI for enhanced matching when available.


 */

import { RawOpportunity, DiscoveryPreferences, SkillMatchDetails } from './types';
import { logger, jaccardSimilarity, calculateWeightedScore } from './utils';
import { RiskLevel, OpportunityType } from '../../shared/schema';
import { anthropicHelper } from './anthropic-helper';

// Feature vector interface for ML scoring
interface FeatureVector {
  skillMatchScore: number;
  timeMatchScore: number;
  riskMatchScore: number;
  incomeMatchScore: number;
  contentQualityScore: number;
  popularityScore: number;
  noviceAccessibilityScore: number;
  timeToRevenueScore: number;
  marketDemandScore: number;
  diversityFactor: number;
}

// Opportunity with associated scoring data
interface ScoredOpportunity {
  opportunity: RawOpportunity;
  score: number;
  features: FeatureVector;
  explanationFactors?: Record<string, number>; // For score explanation
}

// User behavior data for personalization
interface UserBehavior {
  viewedOpportunities: string[];
  savedOpportunities: string[];
  clickedResources: string[];
  lastVisit: Date;
  preferredCategories: Record<string, number>;
  skills: string[];
}

export class MLEngine {
  // Core configuration
  private readonly WEIGHT_MULTIPLIERS = {
    skill: 2.2,           // Skills match is crucial
    income: 1.5,          // Income potential is important
    time: 1.2,            // Time commitment matters
    risk: 1.2,            // Risk level matters
    diversity: 0.8,       // Value for diversity in results
    popularity: 0.7,      // Community validation
    timeToRevenue: 1.3    // Quick revenue is valuable
  };

  // User data storage for personalization
  private userHistory: Map<number, UserBehavior> = new Map();
  private opportunityStats: Map<string, {
    views: number;
    saves: number;
    engagementScore: number;
    lastUpdated: Date;
  }> = new Map();

  // ML model configuration
  private modelVersion = '2.3.0';
  private useAnthropicRanking = false; // Feature flag for Anthropic ranking

  /**
   * Initialize ML Engine with config
   */
  constructor(config?: { useAnthropicRanking?: boolean }) {
    this.useAnthropicRanking = config?.useAnthropicRanking || false;
    logger.info(`Initializing ML Engine v${this.modelVersion} ${this.useAnthropicRanking ? 'with' : 'without'} Anthropic ranking`);
  }

  /**
   * Predict the best opportunities for a user based on their preferences
   * and historical data from similar users
   */
  public async predictBestOpportunities(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
    userId?: number
  ): Promise<RawOpportunity[]> {
    try {
      logger.info(`ML Engine: Predicting best opportunities for ${opportunities.length} items`);

      // Apply content-based filtering first
      let scoredOpportunities = this.applyContentBasedFiltering(opportunities, preferences);

      // Apply collaborative filtering if we have user behavior data
      if (userId && this.userHistory.has(userId)) {
        scoredOpportunities = this.applyCollaborativeFiltering(scoredOpportunities, userId);
      }

      // Apply diversity enhancement to ensure varied results
      scoredOpportunities = this.applyDiversityEnhancement(scoredOpportunities);

      // Apply ROI-based prioritization
      scoredOpportunities = this.applyROIPrioritization(scoredOpportunities, preferences);

      // If AI ranking is enabled and the user has opted in, use Anthropic for final ranking
      if (this.useAnthropicRanking && preferences.useEnhanced) {
        try {
          const rankedOpportunities = await this.applyAnthropicRanking(
            scoredOpportunities.map(item => item.opportunity),
            preferences
          );

          if (rankedOpportunities && rankedOpportunities.length > 0) {
            logger.info('Successfully applied Anthropic ranking to opportunities');
            // Combine AI ranking with our scores
            return this.mergeAnthropicRanking(scoredOpportunities, rankedOpportunities);
          }
        } catch (error) {
          logger.error(`Error in Anthropic ranking: ${error instanceof Error ? error.message : String(error)}`);
          // Continue with our standard ranking if Anthropic fails
        }
      }

      // Sort by final score and return opportunities
      const result = scoredOpportunities
        .sort((a, b) => b.score - a.score)
        .map(item => {
          // Attach explanation factors if available
          const opportunity = item.opportunity;
          const explanationFactors = item.explanationFactors || {};

          return {
            ...opportunity,
            matchScore: item.score,
            matchExplanation: Object.entries(explanationFactors)
              .sort((a, b) => b[1] - a[1]) // Sort factors by importance
              .slice(0, 3) // Take top 3 factors
              .map(([factor, value]) => factor)
          };
        });

      // If userId provided, update user history for personalization
      if (userId) {
        this.updateUserHistory(userId, result.slice(0, 10), preferences.skills);
      }

      return result;
    } catch (error) {
      logger.error(`ML Engine error: ${error instanceof Error ? error.message : String(error)}`);
      // Fall back to simple skill matching if ML fails
      return this.fallbackMatching(opportunities, preferences);
    }
  }

  /**
   * Apply content-based filtering using opportunity features
   */
  private applyContentBasedFiltering(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences
  ): ScoredOpportunity[] {
    // Generate feature vectors for each opportunity
    return opportunities.map(opportunity => {
      // Generate comprehensive feature vector
      const features = this.generateFeatureVector(opportunity, preferences);

      // Calculate score with explanation factors
      const { score, explanationFactors } = this.calculateMLScore(features, preferences);

      return {
        opportunity,
        score,
        features,
        explanationFactors
      };
    });
  }

  /**
   * Apply collaborative filtering based on user behavior
   */
  private applyCollaborativeFiltering(
    scoredOpportunities: ScoredOpportunity[],
    userId: number
  ): ScoredOpportunity[] {
    const userBehavior = this.userHistory.get(userId);
    if (!userBehavior) return scoredOpportunities;

    return scoredOpportunities.map(item => {
      let adjustedScore = item.score;
      const opportunity = item.opportunity;

      // Boost score for opportunities similar to what the user has saved
      const savedCategoryBoost = this.getCategoryBoost(opportunity, userBehavior.preferredCategories);
      adjustedScore += savedCategoryBoost * 0.15;

      // Reduce score for opportunities the user has already viewed but not saved
      if (userBehavior.viewedOpportunities.includes(opportunity.id) && 
          !userBehavior.savedOpportunities.includes(opportunity.id)) {
        adjustedScore *= 0.9;
      }

      // Add the explanation factor if significant
      const explanationFactors = {...item.explanationFactors};
      if (savedCategoryBoost > 0.1) {
        explanationFactors['Matches your preferred categories'] = savedCategoryBoost;
      }

      return {
        ...item,
        score: adjustedScore,
        explanationFactors
      };
    });
  }

  /**
   * Apply diversity enhancement to ensure varied results
   */
  private applyDiversityEnhancement(scoredOpportunities: ScoredOpportunity[]): ScoredOpportunity[] {
    if (scoredOpportunities.length < 5) return scoredOpportunities;

    // Count opportunities by type to identify overrepresentation
    const typeCounts: Record<string, number> = {};
    scoredOpportunities.forEach(item => {
      const type = item.opportunity.type.toString();
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Calculate the diversity penalty for overrepresented types
    const totalOpps = scoredOpportunities.length;
    const targetShare = 1 / Object.keys(OpportunityType).length; // Equal distribution

    return scoredOpportunities.map(item => {
      const type = item.opportunity.type.toString();
      const typeShare = typeCounts[type] / totalOpps;

      // Apply diversity penalty to overrepresented types
      let diversityFactor = 1;
      if (typeShare > targetShare) {
        diversityFactor = 1 - ((typeShare - targetShare) * 0.5);
      }

      // Update feature vector with diversity factor
      const features = {
        ...item.features,
        diversityFactor
      };

      // Recalculate score with diversity consideration
      const adjustedScore = item.score * diversityFactor;

      return {
        ...item,
        score: adjustedScore,
        features
      };
    });
  }

  /**
   * Apply ROI-based prioritization
   */
  private applyROIPrioritization(
    scoredOpportunities: ScoredOpportunity[],
    preferences: DiscoveryPreferences
  ): ScoredOpportunity[] {
    const includeROI = preferences.includeROI || false;
    const roiWeight = includeROI ? 0.25 : 0.1; // Higher weight if explicitly requested

    return scoredOpportunities.map(item => {
      const opportunity = item.opportunity;

      // Calculate ROI factors
      const startupCost = (opportunity.startupCost?.min || 0 + opportunity.startupCost?.max || 100) / 2;
      const timeInvestment = (opportunity.timeRequired?.min || 5 + opportunity.timeRequired?.max || 20) / 2;
      const monthlyIncome = this.estimateMonthlyIncome(opportunity.estimatedIncome);
      const timeToRevenue = this.estimateTimeToFirstRevenue(opportunity);

      // ROI formula: (monthly income / (normalized startup cost + time investment))
      // with a time-to-revenue penalty
      const revenueSpeed = 30 / (timeToRevenue || 30); // Normalized to 0-1 range, faster is better
      const normalizedCost = startupCost / 1000; // Normalize costs to 0-1 scale for small businesses
      const roi = (monthlyIncome * revenueSpeed) / (normalizedCost + timeInvestment/40);

      // Cap ROI at reasonable levels to prevent extreme values
      const cappedRoi = Math.min(100, roi);

      // Normalize to 0-1 range with a reasonable cap
      const normalizedRoi = Math.min(1, cappedRoi / 50);

      // Generate explanation factor for ROI
      const explanationFactors = {...item.explanationFactors};
      if (normalizedRoi > 0.7) {
        explanationFactors['High return on investment'] = normalizedRoi;
      } else if (normalizedRoi > 0.4) {
        explanationFactors['Good return on investment'] = normalizedRoi;
      }

      // Create enhanced opportunity with ROI score
      const adjustedScore = item.score * (1 - roiWeight) + normalizedRoi * roiWeight;

      // Add ROI score to the opportunity data
      opportunity.roiScore = Math.round(normalizedRoi * 100);

      return {
        ...item,
        opportunity,
        score: adjustedScore,
        explanationFactors
      };
    });
  }

  /**
   * Use Anthropic API to rank opportunities based on user preferences
   */
  private async applyAnthropicRanking(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences
  ): Promise<RawOpportunity[]> {
    try {
      // Take top 20 opportunities to rank
      const topOpportunities = opportunities.slice(0, 20);

      // Use Anthropic to rerank opportunities
      return await anthropicHelper.rankOpportunities(topOpportunities, preferences);
    } catch (error) {
      logger.error(`Anthropic ranking error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Merge Anthropic ranking with our scoring
   */
  private mergeAnthropicRanking(
    scoredOpportunities: ScoredOpportunity[],
    rankedOpportunities: RawOpportunity[]
  ): RawOpportunity[] {
    // Create a map of scored opportunities for lookup
    const oppMap = new Map<string, ScoredOpportunity>();
    scoredOpportunities.forEach(item => {
      oppMap.set(item.opportunity.id, item);
    });

    // Merge our scores with Anthropic ranking
    return rankedOpportunities.map(opportunity => {
      const scoredOpp = oppMap.get(opportunity.id);

      return {
        ...opportunity,
        matchScore: scoredOpp?.score || 0.7,
        aiEnhanced: true
      };
    });
  }

  /**
   * Generate comprehensive feature vector for an opportunity
   */
  private generateFeatureVector(
    opportunity: RawOpportunity,
    preferences: DiscoveryPreferences
  ): FeatureVector {
    // Calculate skill match
    const skillMatchScore = this.calculateSkillMatchScore(
      opportunity.requiredSkills,
      opportunity.niceToHaveSkills || [],
      preferences.skills
    );

    // Calculate time match
    const timeMatchScore = this.calculateTimeMatchScore(
      opportunity.timeRequired,
      preferences.timeAvailability
    );

    // Calculate risk match
    const riskMatchScore = this.calculateRiskMatchScore(
      opportunity.entryBarrier,
      preferences.riskAppetite
    );

    // Calculate income match
    const incomeMatchScore = this.calculateIncomeMatchScore(
      opportunity.estimatedIncome,
      preferences.incomeGoals
    );

    // Calculate content quality score (0-1)
    const contentQualityScore = this.calculateContentQualityScore(opportunity);

    // Calculate popularity score based on community data
    const popularityScore = this.getPopularityScore(opportunity.id);

    // Calculate how accessible this is for beginners
    const noviceAccessibilityScore = this.calculateNoviceAccessibilityScore(opportunity);

    // Calculate time to revenue score (quicker is better)
    const timeToRevenueScore = this.calculateTimeToRevenueScore(opportunity);

    // Calculate market demand score
    const marketDemandScore = this.calculateMarketDemandScore(opportunity);

    // Default diversity factor (will be adjusted in diversity enhancement)
    const diversityFactor = 1.0;

    return {
      skillMatchScore,
      timeMatchScore,
      riskMatchScore,
      incomeMatchScore,
      contentQualityScore,
      popularityScore,
      noviceAccessibilityScore,
      timeToRevenueScore,
      marketDemandScore,
      diversityFactor
    };
  }

  /**
   * Calculate ML score with weighted features and generate explanation factors
   */
  private calculateMLScore(
    features: FeatureVector, 
    preferences: DiscoveryPreferences
  ): { score: number, explanationFactors: Record<string, number> } {
    // Define weights for different features
    const weights: Record<string, number> = {
      skillMatchScore: 0.35 * this.WEIGHT_MULTIPLIERS.skill,
      timeMatchScore: 0.15 * this.WEIGHT_MULTIPLIERS.time,
      riskMatchScore: 0.15 * this.WEIGHT_MULTIPLIERS.risk,
      incomeMatchScore: 0.20 * this.WEIGHT_MULTIPLIERS.income,
      contentQualityScore: 0.05,
      popularityScore: 0.05 * this.WEIGHT_MULTIPLIERS.popularity,
      noviceAccessibilityScore: 0.05,
      timeToRevenueScore: 0.15 * this.WEIGHT_MULTIPLIERS.timeToRevenue,
      marketDemandScore: 0.10,
      diversityFactor: 0.05 * this.WEIGHT_MULTIPLIERS.diversity
    };

    // Normalize weights to sum to 1
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizedWeights: Record<string, number> = {};

    Object.keys(weights).forEach(key => {
      normalizedWeights[key] = weights[key] / totalWeight;
    });

    // Calculate weighted score
    const score = calculateWeightedScore(features as any, normalizedWeights);

    // Generate explanation factors based on feature contributions
    const explanationFactors: Record<string, number> = {};

    // Calculate contribution of each feature to final score
    if (features.skillMatchScore > 0.7) {
      explanationFactors['Strong skill match'] = features.skillMatchScore;
    }

    if (features.incomeMatchScore > 0.8) {
      explanationFactors['Meets income goals'] = features.incomeMatchScore;
    }

    if (features.timeMatchScore > 0.8) {
      explanationFactors['Fits your available time'] = features.timeMatchScore;
    }

    if (features.riskMatchScore > 0.8) {
      explanationFactors['Aligns with your risk preference'] = features.riskMatchScore;
    }

    if (features.marketDemandScore > 0.8) {
      explanationFactors['High market demand'] = features.marketDemandScore;
    }

    if (features.timeToRevenueScore > 0.8) {
      explanationFactors['Quick path to revenue'] = features.timeToRevenueScore;
    }

    if (features.noviceAccessibilityScore > 0.8) {
      explanationFactors['Beginner-friendly opportunity'] = features.noviceAccessibilityScore;
    }

    return { score, explanationFactors };
  }

  /**
   * Calculate skill match score with comprehensive analysis
   */
  private calculateSkillMatchScore(
    requiredSkills: string[], 
    niceToHaveSkills: string[],
    userSkills: string[]
  ): number {
    if (!requiredSkills || requiredSkills.length === 0) return 0.5; // Neutral score
    if (!userSkills || userSkills.length === 0) return 0.25; // Low score if no skills

    // Normalize skills for comparison
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase());
    const normalizedNiceToHave = niceToHaveSkills.map(s => s.toLowerCase());
    const normalizedUser = userSkills.map(s => s.toLowerCase());

    // Calculate direct matches for required skills
    const directMatches = normalizedRequired.filter(skill => 
      normalizedUser.includes(skill)
    ).length;

    // Calculate partial matches for required skills (where one contains the other)
    const partialMatches = normalizedRequired.filter(reqSkill => 
      !normalizedUser.includes(reqSkill) && // Not already counted as direct match
      normalizedUser.some(userSkill => 
        reqSkill.includes(userSkill) || userSkill.includes(reqSkill)
      )
    ).length;

    // Calculate nice-to-have skill matches
    const niceToHaveMatches = normalizedNiceToHave.filter(skill =>
      normalizedUser.includes(skill)
    ).length;

    // Calculate comprehensive skill match score
    const requiredWeight = 0.75; // 75% of score from required skills
    const niceToHaveWeight = 0.25; // 25% of score from nice-to-have skills

    // Required skills score (direct matches worth full value, partial worth half)
    const requiredScore = normalizedRequired.length === 0 ? 0.5 : 
      (directMatches + (partialMatches * 0.5)) / normalizedRequired.length;

    // Nice-to-have skills score
    const niceToHaveScore = normalizedNiceToHave.length === 0 ? 0.5 :
      niceToHaveMatches / normalizedNiceToHave.length;

    // Weighted combined score
    return (requiredScore * requiredWeight) + (niceToHaveScore * niceToHaveWeight);
  }

  /**
   * Calculate time match score with nuanced analysis
   */
  private calculateTimeMatchScore(
    timeRequired: { min: number, max: number } | undefined,
    timeAvailability: string
  ): number {
    if (!timeAvailability || timeAvailability === 'any') return 0.5; // Neutral
    if (!timeRequired) return 0.5;

    const availableHours = this.parseTimeAvailability(timeAvailability);
    if (availableHours === 0) return 0.5;

    const avgTimeRequired = (timeRequired.min + timeRequired.max) / 2;

    // Calculate how well the time requirement fits availability
    const ratio = avgTimeRequired / availableHours;

    // Score based on how well it fits available time
    if (ratio <= 0.3) return 0.95; // Uses less than 30% of available time
    if (ratio <= 0.5) return 0.9; // Uses 30-50% of available time
    if (ratio <= 0.7) return 0.8; // Uses 50-70% of available time
    if (ratio <= 0.9) return 0.7; // Uses 70-90% of available time
    if (ratio <= 1.0) return 0.6; // Uses almost all available time
    if (ratio <= 1.2) return 0.4; // Slightly exceeds available time
    if (ratio <= 1.5) return 0.3; // Moderately exceeds available time
    return 0.1; // Significantly exceeds available time
  }

  /**
   * Calculate risk match score with nuanced analysis
   */
  private calculateRiskMatchScore(
    entryBarrier: RiskLevel | string | undefined,
    riskAppetite: string
  ): number {
    if (!riskAppetite || riskAppetite === 'any') return 0.5; // Neutral
    if (!entryBarrier) return 0.5;

    const riskMap: Record<string, number> = {
      'LOW': 1, 'low': 1, 'Low': 1, 
      'MEDIUM': 2, 'medium': 2, 'Medium': 2, 
      'HIGH': 3, 'high': 3, 'High': 3
    };

    let opportunityRisk: number;
    if (typeof entryBarrier === 'string') {
      opportunityRisk = riskMap[entryBarrier] || 2;
    } else {
      opportunityRisk = entryBarrier === RiskLevel.LOW ? 1 : 
                        entryBarrier === RiskLevel.HIGH ? 3 : 2;
    }

    const userRisk = riskMap[riskAppetite] || 2;

    // Calculate score based on risk difference
    const diff = userRisk - opportunityRisk;

    if (diff === 0) return 1.0; // Perfect match
    if (diff === -1) return 0.5; // Opportunity slightly riskier than preference
    if (diff === 1) return 0.8; // Opportunity safer than preference
    if (diff < -1) return 0.2; // Opportunity much riskier than preference
    return 0.6; // Opportunity much safer than preference
  }

  /**
   * Calculate income match score with nuanced analysis
   */
  private calculateIncomeMatchScore(
    estimatedIncome: { min: number, max: number, timeframe: string } | undefined,
    incomeGoal: number
  ): number {
    if (!incomeGoal) return 0.5; // Neutral if no goal
    if (!estimatedIncome) return 0.3; // Below average if no income info

    // Convert to monthly income
    const monthlyIncome = this.estimateMonthlyIncome(estimatedIncome);

    // Calculate ratio of income potential to goal
    const ratio = monthlyIncome / incomeGoal;

    // Score based on how close to or exceeding the goal
    if (ratio >= 2.0) return 1.0; // Double or more of goal
    if (ratio >= 1.5) return 0.95; // Exceeds goal by 50%
    if (ratio >= 1.0) return 0.9; // Meets goal
    if (ratio >= 0.8) return 0.8; // 80% of goal
    if (ratio >= 0.6) return 0.7; // 60% of goal
    if (ratio >= 0.4) return 0.5; // 40% of goal
    if (ratio >= 0.2) return 0.3; // 20% of goal
    return 0.2; // Less than 20% of goal
  }

  /**
   * Calculate content quality score based on opportunity completeness
   */
  private calculateContentQualityScore(opportunity: RawOpportunity): number {
    let score = 0.5; // Default score

    // Assess description quality
    if (opportunity.description) {
      if (opportunity.description.length > 300) score += 0.15;
      else if (opportunity.description.length > 150) score += 0.05;
    }

    // Assess presence of resources
    if (opportunity.resources && opportunity.resources.length > 0) {
      score += 0.1;
    } else if (opportunity.resourceLinks && opportunity.resourceLinks.length > 0) {
      score += 0.05;
    }

    // Assess steps to start
    if (opportunity.stepsToStart && opportunity.stepsToStart.length >= 3) {
      score += 0.1;
    }

    // Assess success stories
    if (opportunity.successStories && 
        (Array.isArray(opportunity.successStories) && opportunity.successStories.length > 0 || 
         typeof opportunity.successStories === 'string' && opportunity.successStories.length > 0)) {
      score += 0.1;
    }

    // Cap score at 1.0
    return Math.min(1.0, score);
  }

  /**
   * Get popularity score for an opportunity
   */
  private getPopularityScore(opportunityId: string): number {
    // Get stats for this opportunity
    const stats = this.opportunityStats.get(opportunityId);

    if (!stats) return 0.5; // Default score for unknown opportunities

    // Calculate popularity score based on views and saves
    // More saves = higher score
    const viewsScore = Math.min(1.0, stats.views / 100); // Cap at 100 views
    const savesScore = Math.min(1.0, stats.saves * 0.2); // Each save worth 0.2, cap at 5 saves

    // Combined score weighted towards saves
    return (viewsScore * 0.3) + (savesScore * 0.7);
  }

  /**
   * Calculate how accessible this opportunity is for beginners
   */
  private calculateNoviceAccessibilityScore(opportunity: RawOpportunity): number {
    let accessibilityScore = 0.5; // Default middle score

    // Entry barrier is a strong indicator
    if (opportunity.entryBarrier === RiskLevel.LOW || opportunity.entryBarrier === 'LOW' || opportunity.entryBarrier === 'Low') {
      accessibilityScore += 0.3;
    } else if (opportunity.entryBarrier === RiskLevel.HIGH || opportunity.entryBarrier === 'HIGH' || opportunity.entryBarrier === 'High') {
      accessibilityScore -= 0.3;
    }

    // Fewer required skills = more accessible
    if (opportunity.requiredSkills && opportunity.requiredSkills.length <= 2) {
      accessibilityScore += 0.1;
    } else if (opportunity.requiredSkills && opportunity.requiredSkills.length >= 5) {
      accessibilityScore -= 0.1;
    }

    // Lower startup costs = more accessible
    if (opportunity.startupCost && opportunity.startupCost.max < 100) {
      accessibilityScore += 0.1;
    } else if (opportunity.startupCost && opportunity.startupCost.min > 1000) {
      accessibilityScore -= 0.1;
    }

    // Cap between 0-1
    return Math.min(1.0, Math.max(0.0, accessibilityScore));
  }

  /**
   * Calculate time to revenue score (quicker time to revenue = higher score)
   */
  private calculateTimeToRevenueScore(opportunity: RawOpportunity): number {
    // Extract time to revenue from opportunity data
    const timeToRevenue = this.estimateTimeToFirstRevenue(opportunity);

    // Convert to score (higher = quicker revenue)
    if (timeToRevenue <= 7) return 1.0;  // 1 week or less
    if (timeToRevenue <= 14) return 0.9; // 2 weeks
    if (timeToRevenue <= 30) return 0.8; // 1 month
    if (timeToRevenue <= 60) return 0.6; // 2 months
    if (timeToRevenue <= 90) return 0.4; // 3 months
    return 0.2; // More than 3 months
  }

  /**
   * Calculate market demand score based on opportunity data
   */
  private calculateMarketDemandScore(opportunity: RawOpportunity): number {
    // Check if market demand is explicitly stated
    if (opportunity.marketDemand) {
      const demand = opportunity.marketDemand.toString().toUpperCase();
      if (demand === 'HIGH') return 0.9;
      if (demand === 'MEDIUM') return 0.6;
      if (demand === 'LOW') return 0.3;
    }

    // Estimate from opportunity type if not explicitly stated
    const type = opportunity.type.toString();

    // General market demand estimations by type (could be refined)
    if (type === OpportunityType.FREELANCE.toString()) return 0.8;
    if (type === OpportunityType.SERVICE.toString()) return 0.75;
    if (type === OpportunityType.DIGITAL_PRODUCT.toString()) return 0.7;
    if (type === OpportunityType.CONTENT.toString()) return 0.65;
    if (type === OpportunityType.INFO_PRODUCT.toString()) return 0.6;
    if (type === OpportunityType.PASSIVE.toString()) return 0.5;

    // Default moderate demand
    return 0.6;
  }

  /**
   * Get category boost factor based on user preferred categories
   */
  private getCategoryBoost(
    opportunity: RawOpportunity, 
    preferredCategories: Record<string, number>
  ): number {
    const type = opportunity.type.toString();

    // Check if this type is in user's preferred categories
    const categoryScore = preferredCategories[type] || 0;

    // Convert to boost factor (0-0.2)
    return Math.min(0.2, categoryScore / 10);
  }

  /**
   * Update user history with selected opportunities
   */
  private updateUserHistory(
    userId: number, 
    opportunities: RawOpportunity[],
    skills: string[]
  ): void {
    // Get or initialize user behavior data
    const userBehavior = this.userHistory.get(userId) || {
      viewedOpportunities: [],
      savedOpportunities: [],
      clickedResources: [],
      lastVisit: new Date(),
      preferredCategories: {},
      skills: []
    };

    // Consider these opportunities as viewed
    opportunities.forEach(opportunity => {
      if (!userBehavior.viewedOpportunities.includes(opportunity.id)) {
        userBehavior.viewedOpportunities.push(opportunity.id);
      }

      // Update opportunity stats
      this.updateOpportunityStats(opportunity.id, 'view');
    });

    // Update user's skills
    userBehavior.skills = skills || userBehavior.skills;

    // Update last visit time
    userBehavior.lastVisit = new Date();

    // Limit viewed opportunities list to last 100
    if (userBehavior.viewedOpportunities.length > 100) {
      userBehavior.viewedOpportunities = userBehavior.viewedOpportunities.slice(-100);
    }

    // Update user history
    this.userHistory.set(userId, userBehavior);
  }

  /**
   * Record user interaction with an opportunity
   */
  public recordUserInteraction(
    userId: number,
    opportunityId: string,
    interactionType: 'view' | 'save' | 'resource_click'
  ): void {
    // Get or initialize user behavior data
    const userBehavior = this.userHistory.get(userId) || {
      viewedOpportunities: [],
      savedOpportunities: [],
      clickedResources: [],
      lastVisit: new Date(),
      preferredCategories: {},
      skills: []
    };

    // Update based on interaction type
    if (interactionType === 'view' && !userBehavior.viewedOpportunities.includes(opportunityId)) {
      userBehavior.viewedOpportunities.push(opportunityId);
      this.updateOpportunityStats(opportunityId, 'view');
    } else if (interactionType === 'save' && !userBehavior.savedOpportunities.includes(opportunityId)) {
      userBehavior.savedOpportunities.push(opportunityId);

      // Update preferred categories when user saves an opportunity
      const opportunity = this.opportunityCache.get(opportunityId);
      if (opportunity) {
        const type = opportunity.type.toString();
        userBehavior.preferredCategories[type] = (userBehavior.preferredCategories[type] || 0) + 1;
      }

      this.updateOpportunityStats(opportunityId, 'save');
    } else if (interactionType === 'resource_click') {
      userBehavior.clickedResources.push(opportunityId);
    }

    // Update last visit time
    userBehavior.lastVisit = new Date();

    // Update user history
    this.userHistory.set(userId, userBehavior);
  }

  /**
   * Update opportunity stats
   */
  private updateOpportunityStats(
    opportunityId: string,
    action: 'view' | 'save'
  ): void {
    // Get or initialize stats for this opportunity
    const stats = this.opportunityStats.get(opportunityId) || {
      views: 0,
      saves: 0,
      engagementScore: 0,
      lastUpdated: new Date()
    };

    // Update stats based on action
    if (action === 'view') {
      stats.views += 1;
    } else if (action === 'save') {
      stats.saves += 1;
    }

    // Recalculate engagement score
    stats.engagementScore = stats.views === 0 ? 0 : Math.min(1, (stats.saves / stats.views) * 5);
    stats.lastUpdated = new Date();

    // Update stats
    this.opportunityStats.set(opportunityId, stats);
  }

  /**
   * Get cached opportunity data
   * Used for getting opportunity details from ID
   */
  private opportunityCache: Map<string, RawOpportunity> = new Map();

  /**
   * Register an opportunity in the cache
   */
  public cacheOpportunity(opportunity: RawOpportunity): void {
    if (opportunity && opportunity.id) {
      this.opportunityCache.set(opportunity.id, opportunity);
    }
  }

  /**
   * Estimate monthly income from various timeframes
   */
  private estimateMonthlyIncome(
    estimatedIncome: { min: number, max: number, timeframe: string } | undefined
  ): number {
    if (!estimatedIncome) return 0;

    const avgIncome = (estimatedIncome.min + estimatedIncome.max) / 2;
    const timeframe = estimatedIncome.timeframe.toLowerCase();

    if (timeframe.includes('hour')) return avgIncome * 160; // 40h/week * 4 weeks
    if (timeframe.includes('day')) return avgIncome * 20; // 5 days/week * 4 weeks
    if (timeframe.includes('week')) return avgIncome * 4;
    if (timeframe.includes('month')) return avgIncome;
    if (timeframe.includes('year')) return avgIncome / 12;
    if (timeframe.includes('project')) return avgIncome / 3; // Assume 3-month projects

    return avgIncome; // Default if unknown
  }

  /**
   * Estimate time to first revenue in days
   */
  private estimateTimeToFirstRevenue(opportunity: RawOpportunity): number {
    // Use the timeToFirstRevenue field if it exists
    if (opportunity.timeToFirstRevenue) {
      const timeText = opportunity.timeToFirstRevenue.toLowerCase();

      // Extract numeric values if present
      const numbers = timeText.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        // Get the first number
        const value = parseInt(numbers[0]);

        // Adjust based on unit
        if (timeText.includes('day')) return value;
        if (timeText.includes('week')) return value * 7;
        if (timeText.includes('month')) return value * 30;
      }

      // Estimate based on text patterns
      if (timeText.includes('immediate')) return 1;
      if (timeText.includes('few days')) return 3;
      if (timeText.includes('week')) return 7;
      if (timeText.includes('two week')) return 14;
      if (timeText.includes('month')) return 30;
      if (timeText.includes('quarter')) return 90;
    }

    // Fallback to estimating based on opportunity type
    const type = opportunity.type.toString();

    switch (type) {
      case OpportunityType.FREELANCE.toString(): return 14; // 2 weeks
      case OpportunityType.SERVICE.toString(): return 21; // 3 weeks
      case OpportunityType.CONTENT.toString(): return 30; // 1 month
      case OpportunityType.DIGITAL_PRODUCT.toString(): return 60; // 2 months
      case OpportunityType.INFO_PRODUCT.toString(): return 45; // 1.5 months
      case OpportunityType.PASSIVE.toString(): return 90; // 3 months
      default: return 30; // Default 1 month
    }
  }

  /**
   * Parse time availability string to hours per week
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
   * Simple fallback matching if ML approach fails
   */
  private fallbackMatching(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences
  ): RawOpportunity[] {
    logger.info(`Using fallback skill matching algorithm for ${opportunities.length} opportunities`);

    return opportunities
      .map(opportunity => {
        // Calculate basic skill match
        let skillMatchScore = this.calculateSkillMatchScore(
          opportunity.requiredSkills,
          opportunity.niceToHaveSkills || [],
          preferences.skills
        );

        // Simple adjustments for time and risk
        if (preferences.timeAvailability !== 'any' && opportunity.timeRequired) {
          const availableHours = this.parseTimeAvailability(preferences.timeAvailability);
          const requiredHours = (opportunity.timeRequired.min + opportunity.timeRequired.max) / 2;

          if (requiredHours > availableHours * 1.2) {
            skillMatchScore *= 0.8; // Penalty if requires too much time
          }
        }

        if (preferences.riskAppetite !== 'any' && opportunity.entryBarrier) {
          const riskMatch = this.calculateRiskMatchScore(
            opportunity.entryBarrier,
            preferences.riskAppetite
          );

          if (riskMatch < 0.5) {
            skillMatchScore *= 0.9; // Penalty if risk mismatch
          }
        }

        return {
          ...opportunity,
          matchScore: Math.max(0, Math.min(1, skillMatchScore)) // Ensure score is in 0-1 range
        };
      })
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)); // Sort by score
  }
}
