/**
 * Machine Learning Engine for Opportunity Matching
 * 
 * This module provides machine learning capabilities to enhance
 * opportunity matching and personalization.
 */

import { RawOpportunity, DiscoveryPreferences } from './types';
import { logger, jaccardSimilarity, calculateWeightedScore } from './utils';

interface FeatureVector {
  skillMatch: number;
  timeMatch: number;
  riskMatch: number;
  incomeMatch: number;
  readabilityScore: number;
  popularityScore: number;
}

interface MatchingResult {
  opportunity: RawOpportunity;
  score: number;
  features: FeatureVector;
}

export class MLEngine {
  private skillWeightMultiplier = 2.0; // Skill match has higher importance
  private userHistory: Map<number, RawOpportunity[]> = new Map();
  private communityEngagement: Map<string, number> = new Map(); // Track opportunity IDs and engagement
  
  /**
   * Predict the best opportunities for a user based on their preferences
   * and historical data from similar users
   */
  public predictBestOpportunities(
    opportunities: RawOpportunity[],
    preferences: DiscoveryPreferences,
    userId?: number,
    communityData?: { opportunityId: string, engagementScore: number }[]
  ): RawOpportunity[] {
    try {
      logger.info(`ML Engine: Predicting best opportunities for ${opportunities.length} items`);
      
      // Initialize community data if provided
      if (communityData) {
        this.updateCommunityData(communityData);
      }
      
      // Generate feature vectors for each opportunity
      const scoredOpportunities = opportunities.map(opportunity => {
        const features = this.generateFeatureVector(opportunity, preferences);
        const score = this.calculateMLScore(features, preferences);
        
        return {
          opportunity,
          score,
          features
        };
      });
      
      // Apply ROI-based prioritization
      const roiPrioritized = this.applyROIPrioritization(scoredOpportunities);
      
      // Sort by final score and return opportunities
      const result = roiPrioritized
        .sort((a, b) => b.score - a.score)
        .map(item => ({
          ...item.opportunity,
          matchScore: item.score
        }));
      
      // If userId provided, update user history
      if (userId) {
        this.updateUserHistory(userId, result.slice(0, 5));
      }
      
      return result;
    } catch (error) {
      logger.error(`ML Engine error: ${error instanceof Error ? error.message : String(error)}`);
      // Fall back to simple skill matching if ML fails
      return this.fallbackMatching(opportunities, preferences);
    }
  }
  
  /**
   * Generate feature vector for an opportunity based on user preferences
   */
  private generateFeatureVector(
    opportunity: RawOpportunity,
    preferences: DiscoveryPreferences
  ): FeatureVector {
    // Calculate skill match
    const skillMatch = this.calculateSkillMatchScore(
      opportunity.requiredSkills, 
      preferences.skills
    );
    
    // Calculate time match
    const timeMatch = this.calculateTimeMatchScore(
      opportunity.timeRequired,
      preferences.timeAvailability
    );
    
    // Calculate risk match
    const riskMatch = this.calculateRiskMatchScore(
      opportunity.entryBarrier,
      preferences.riskAppetite
    );
    
    // Calculate income match
    const incomeMatch = this.calculateIncomeMatchScore(
      opportunity.estimatedIncome,
      preferences.incomeGoals
    );
    
    // Calculate readability score (0-1)
    const readabilityScore = (opportunity.description && typeof opportunity.description === 'string') 
      ? Math.min(1, opportunity.description.length / 5000) * 0.5 + 0.5 // Simple proxy for now
      : 0.5;
    
    // Calculate popularity score based on community data
    const popularityScore = this.getCommunityEngagementScore(opportunity.id);
    
    return {
      skillMatch,
      timeMatch, 
      riskMatch,
      incomeMatch,
      readabilityScore,
      popularityScore
    };
  }
  
  /**
   * Calculate ML score with weighted features
   */
  private calculateMLScore(features: FeatureVector, preferences: DiscoveryPreferences): number {
    // Define weights for different features
    const weights: Record<string, number> = {
      skillMatch: 0.35 * this.skillWeightMultiplier,
      timeMatch: 0.15,
      riskMatch: 0.15,
      incomeMatch: 0.20,
      readabilityScore: 0.05,
      popularityScore: 0.10
    };
    
    // Normalize weights
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    Object.keys(weights).forEach(key => {
      weights[key] = weights[key] / totalWeight;
    });
    
    // Calculate weighted score
    return calculateWeightedScore(features as any, weights);
  }
  
  /**
   * Apply ROI-based prioritization to further enhance scoring
   */
  private applyROIPrioritization(
    scoredOpportunities: MatchingResult[]
  ): MatchingResult[] {
    return scoredOpportunities.map(item => {
      // Calculate simple ROI score
      const opportunity = item.opportunity;
      
      // Initial investment (time and money)
      const startupCost = (opportunity.startupCost.min + opportunity.startupCost.max) / 2;
      const timeInvestment = (opportunity.timeRequired.min + opportunity.timeRequired.max) / 2;
      
      // Potential return
      const monthlyIncome = this.estimateMonthlyIncome(opportunity.estimatedIncome);
      
      // Simplified ROI calculation 
      // (monthly income / (startup cost / 1000 + time investment))
      const roi = monthlyIncome / (startupCost / 1000 + timeInvestment);
      
      // Normalize ROI to 0-1 range with a reasonable cap
      const normalizedRoi = Math.min(1, roi / 100);
      
      // Adjust score with ROI (giving ROI a 20% weight in final score)
      const adjustedScore = item.score * 0.8 + normalizedRoi * 0.2;
      
      return {
        ...item,
        score: adjustedScore
      };
    });
  }
  
  /**
   * Update community engagement data
   */
  private updateCommunityData(data: { opportunityId: string, engagementScore: number }[]): void {
    data.forEach(item => {
      this.communityEngagement.set(item.opportunityId, item.engagementScore);
    });
  }
  
  /**
   * Get community engagement score for an opportunity
   */
  private getCommunityEngagementScore(opportunityId: string): number {
    return this.communityEngagement.get(opportunityId) || 0.5; // Default mid-range score
  }
  
  /**
   * Update user history with selected opportunities
   */
  private updateUserHistory(userId: number, opportunities: RawOpportunity[]): void {
    const userHistory = this.userHistory.get(userId) || [];
    this.userHistory.set(userId, [...userHistory, ...opportunities].slice(-20)); // Keep last 20
  }
  
  /**
   * Calculate skill match score between required skills and user skills
   */
  private calculateSkillMatchScore(requiredSkills: string[], userSkills: string[]): number {
    if (!requiredSkills || requiredSkills.length === 0) return 0.5;
    if (!userSkills || userSkills.length === 0) return 0.25;
    
    return jaccardSimilarity(
      requiredSkills.map(s => s.toLowerCase()), 
      userSkills.map(s => s.toLowerCase())
    );
  }
  
  /**
   * Calculate time match score
   */
  private calculateTimeMatchScore(
    timeRequired: { min: number, max: number },
    timeAvailability: string
  ): number {
    if (!timeAvailability || timeAvailability === 'any') return 0.5;
    
    const availableHours = this.parseTimeAvailability(timeAvailability);
    if (availableHours === 0) return 0.5;
    
    const avgTimeRequired = (timeRequired.min + timeRequired.max) / 2;
    const ratio = avgTimeRequired / availableHours;
    
    if (ratio <= 0.3) return 0.9;
    if (ratio <= 0.6) return 0.8;
    if (ratio <= 0.9) return 0.7;
    if (ratio <= 1.0) return 0.6;
    if (ratio <= 1.5) return 0.4;
    return 0.2;
  }
  
  /**
   * Calculate risk match score
   */
  private calculateRiskMatchScore(entryBarrier: string, riskAppetite: string): number {
    if (!riskAppetite || riskAppetite === 'any') return 0.5;
    
    const riskMap: Record<string, number> = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'low': 1,
      'medium': 2,
      'high': 3
    };
    
    const opportunityRisk = riskMap[entryBarrier] || 2;
    const userRisk = riskMap[riskAppetite] || 2;
    
    const diff = userRisk - opportunityRisk;
    
    if (diff === 0) return 1.0;
    if (diff === -1) return 0.5;
    if (diff === 1) return 0.8;
    if (diff < -1) return 0.2;
    return 0.6;
  }
  
  /**
   * Calculate income match score
   */
  private calculateIncomeMatchScore(
    estimatedIncome: { min: number, max: number, timeframe: string },
    incomeGoal: number
  ): number {
    if (!incomeGoal) return 0.5;
    
    const monthlyIncome = this.estimateMonthlyIncome(estimatedIncome);
    const ratio = monthlyIncome / incomeGoal;
    
    if (ratio >= 2.0) return 1.0;
    if (ratio >= 1.0) return 0.9;
    if (ratio >= 0.7) return 0.8;
    if (ratio >= 0.5) return 0.7;
    if (ratio >= 0.3) return 0.5;
    return 0.3;
  }
  
  /**
   * Estimate monthly income from various timeframes
   */
  private estimateMonthlyIncome(
    estimatedIncome: { min: number, max: number, timeframe: string }
  ): number {
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
    return opportunities
      .map(opportunity => {
        const skillMatchScore = this.calculateSkillMatchScore(
          opportunity.requiredSkills,
          preferences.skills
        );
        
        return {
          ...opportunity,
          matchScore: skillMatchScore
        };
      })
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }
}