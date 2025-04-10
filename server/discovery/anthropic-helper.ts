/**
 * Anthropic AI Helper for Intelligent Monetization Opportunity Suggestions
 * 
 * This module leverages Anthropic's Claude AI to generate more thoughtful,
 * personalized, and high-quality monetization opportunity suggestions based
 * on user skills and preferences.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from './utils';
import { DiscoveryPreferences, RawOpportunity } from './types';
import { OpportunityType, RiskLevel } from '../../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { promptManager } from './prompt-manager';
import { configManager } from './config-manager';
import { skillGraph } from './skill-graph';
import { marketDataService } from './market-data';

// Initialize Anthropic client
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper function to generate unique IDs
const generateOpportunityId = (source: string, type: string) => 
  `${source}-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export class AnthropicHelper {
  /**
   * Generate thoughtful monetization opportunity suggestions using Anthropic AI
   * @param preferences User's discovery preferences
   * @param count Number of opportunities to generate
   * @returns Array of thoughtfully generated opportunities
   */
  public async generateOpportunities(
    preferences: DiscoveryPreferences,
    count: number = 5
  ): Promise<RawOpportunity[]> {
    try {
      logger.info(`Using Anthropic AI to generate ${count} thoughtful opportunities`);
      
      // Get the template and template ID
      const template = promptManager.getTemplate('opportunityGeneration');
      const templateId = template.id;
      
      // Create a detailed prompt for Claude to generate personalized opportunities
      const prompt = this.createOpportunityGenerationPrompt(preferences, count);
      
      // Validate prompt to ensure we don't send empty content
      if (!prompt || prompt.trim() === '') {
        logger.error('Empty prompt generated for Anthropic API call');
        throw new Error('Cannot send empty prompt to Anthropic API');
      }
      
      // Get system prompt with validation
      const systemPrompt = this.getSystemPrompt();
      if (!systemPrompt || systemPrompt.trim() === '') {
        logger.error('Empty system prompt for Anthropic API call');
        throw new Error('Cannot send empty system prompt to Anthropic API');
      }
      
      // Call Anthropic API
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        system: systemPrompt,
      });
      
      // Parse the response to extract opportunities
      const contentBlock = response.content[0];
      if (contentBlock.type !== 'text') {
        throw new Error('Unexpected response format from Anthropic AI');
      }
      const opportunities = this.parseAnthropicResponse(contentBlock.text);
      
      // Ensure required fields and formatting
      const enhancedOpportunities = this.enhanceOpportunities(opportunities, preferences);
      
      logger.info(`Successfully generated ${enhancedOpportunities.length} opportunities using Anthropic AI`);
      return enhancedOpportunities;
    } catch (error) {
      logger.error(`Anthropic opportunity generation error: ${error instanceof Error ? error.message : String(error)}`);
      return this.getFallbackOpportunities(preferences, count);
    }
  }
  
  /**
   * Generate a detailed system prompt for Claude
   */
  private getSystemPrompt(): string {
    // Use the prompt manager to get the system prompt
    return promptManager.getTemplate('system').template;
  }
  
  /**
   * Create a detailed prompt for Claude to generate personalized opportunities
   */
  private createOpportunityGenerationPrompt(
    preferences: DiscoveryPreferences,
    count: number
  ): string {
    const { skills, timeAvailability, riskAppetite, incomeGoals, workPreference, additionalDetails } = preferences;
    
    const skillsText = skills.join(', ');
    const timeText = this.formatTimeAvailability(timeAvailability);
    const riskText = this.formatRiskLevel(riskAppetite);
    const incomeText = incomeGoals ? `$${incomeGoals} per month` : 'flexible';
    const prefText = workPreference || 'flexible';
    const detailsText = additionalDetails || 'No additional details provided';

    // Log variables to help debug
    logger.info(`Opportunity generation variables:
      - skills: ${skillsText}
      - time: ${timeText}
      - risk: ${riskText}
      - income: ${incomeText}
      - preference: ${prefText}
      - details: ${detailsText}`);

    // Use the prompt manager's fillTemplate method instead of doing manual replacements
    try {
      const filledTemplate = promptManager.fillTemplate('opportunity_generation', {
        count: String(count),
        skillsText,
        timeText, 
        riskText,
        incomeText,
        prefText,
        detailsText
      });
      
      // Verify template length
      if (!filledTemplate || filledTemplate.trim() === '') {
        logger.error(`Generated empty prompt after template filling. Template type: opportunity_generation`);
        // Try the camelCase version as fallback
        const fallbackTemplate = promptManager.fillTemplate('opportunityGeneration', {
          count: String(count),
          skillsText,
          timeText, 
          riskText,
          incomeText,
          prefText,
          detailsText
        });
        
        if (!fallbackTemplate || fallbackTemplate.trim() === '') {
          throw new Error('Both template variants failed to generate a valid prompt');
        }
        
        logger.info(`Fallback template filled successfully, length: ${fallbackTemplate.length}`);
        return fallbackTemplate;
      }
      
      logger.info(`Template filled successfully, length: ${filledTemplate.length}`);
      return filledTemplate;
    } catch (error) {
      logger.error(`Error filling opportunity generation template: ${error}`);
      
      // As a last resort fallback, create a simple hand-crafted prompt
      const manualPrompt = `Please suggest ${count} personalized monetization opportunities based on the following profile:
      
      SKILLS: ${skillsText}
      TIME AVAILABILITY: ${timeText}
      RISK TOLERANCE: ${riskText}
      INCOME GOAL: ${incomeText}
      WORK PREFERENCE: ${prefText}
      ADDITIONAL DETAILS: ${detailsText}
      
      Respond with opportunities in valid JSON array format.`;
      
      logger.info(`Using manually generated prompt as fallback, length: ${manualPrompt.length}`);
      return manualPrompt;
    }
  }
  
  /**
   * Parse Anthropic response to extract opportunity suggestions
   */
  private parseAnthropicResponse(responseText: string): any[] {
    try {
      // First try if the entire response is valid JSON
      try {
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return [parsed]; // If it's a single object, wrap it in an array
      } catch (parseError) {
        // Not valid JSON, continue with extraction
      }
      
      // Try to extract JSON array by looking for bracket patterns
      const startBracket = responseText.indexOf('[');
      const endBracket = responseText.lastIndexOf(']');
      
      if (startBracket >= 0 && endBracket > startBracket) {
        try {
          const jsonArray = responseText.substring(startBracket, endBracket + 1);
          const parsed = JSON.parse(jsonArray);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (arrayError) {
          // Failed to parse as array
        }
      }
      
      // Try to extract a single JSON object
      const startBrace = responseText.indexOf('{');
      const endBrace = responseText.lastIndexOf('}');
      
      if (startBrace >= 0 && endBrace > startBrace) {
        try {
          const jsonObj = responseText.substring(startBrace, endBrace + 1);
          const parsed = JSON.parse(jsonObj);
          return [parsed]; // Wrap single object in array
        } catch (objError) {
          // Failed to parse as object
        }
      }
      
      logger.warn('Could not extract JSON from Anthropic response');
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error parsing Anthropic response: ${errorMessage}`);
      return [];
    }
  }
  
  /**
   * Enhance AI-generated opportunities with additional required fields
   */
  private enhanceOpportunities(
    opportunities: any[],
    preferences: DiscoveryPreferences
  ): RawOpportunity[] {
    return opportunities.map((opp: any) => {
      // Ensure all fields are present and properly formatted
      const opportunityType = this.validateOpportunityType(opp.type);
      const entryBarrier = this.validateRiskLevel(opp.entryBarrier);
      
      // Extract any category information from the title and description
      let category = 'general';
      const description = opp.description || '';
      const title = opp.title || '';
      
      if (description.toLowerCase().includes('design') || title.toLowerCase().includes('design')) {
        category = 'design';
      } else if (description.toLowerCase().includes('writing') || title.toLowerCase().includes('writing')) {
        category = 'writing';
      } else if (description.toLowerCase().includes('develop') || title.toLowerCase().includes('develop')) {
        category = 'web_development';
      } else if (description.toLowerCase().includes('teach') || title.toLowerCase().includes('teach')) {
        category = 'education';
      }
      
      // Get more accurate income range from market data if AI didn't provide it
      let estimatedIncome = opp.estimatedIncome;
      if (!estimatedIncome || !estimatedIncome.min || !estimatedIncome.max) {
        estimatedIncome = marketDataService.calculateIncomeRange(category, opportunityType);
      }
      
      // Generate ROI score (0-100)
      const roiScore = this.calculateROIScore(
        estimatedIncome, 
        opp.startupCost || { min: 0, max: 100 }, 
        opp.timeRequired || { min: 5, max: 20 },
        opportunityType,
        category
      );
      
      // Generate skill gap analysis
      const skillGapDays = this.calculateSkillGapDays(
        opp.requiredSkills || [],
        opp.niceToHaveSkills || [],
        preferences.skills
      );
      
      // Calculate time to first revenue
      const timeToFirstRevenue = this.estimateTimeToFirstRevenue(
        opportunityType, 
        entryBarrier,
        skillGapDays
      );
      
      // Calculate market demand using market data
      const marketDemandScore = marketDataService.calculateMarketDemandScore(opportunityType, category);
      const marketDemand = marketDemandScore > 0.7 ? 'HIGH' : marketDemandScore > 0.4 ? 'MEDIUM' : 'LOW';
      
      return {
        id: generateOpportunityId('anthropic', opportunityType.toLowerCase()),
        source: 'anthropic',
        title: opp.title || 'Monetization Opportunity',
        description: opp.description || 'No description provided',
        requiredSkills: opp.requiredSkills || [],
        niceToHaveSkills: opp.niceToHaveSkills || [],
        type: opportunityType,
        estimatedIncome: estimatedIncome,
        startupCost: opp.startupCost || { min: 0, max: 100 },
        timeRequired: opp.timeRequired || { min: 5, max: 20 },
        entryBarrier: entryBarrier,
        marketDemand: opp.marketDemand || marketDemand,
        stepsToStart: opp.stepsToStart || ['Research the opportunity', 'Create a plan', 'Take the first step'],
        successStories: opp.successStory ? [opp.successStory] : [],
        resources: opp.resources || [],
        skillGapDays,
        matchScore: 0.9, // High match score because these are personalized by AI
        timeToFirstRevenue,
        roiScore
      };
    });
  }
  
  /**
   * Calculate ROI score (0-100) for an opportunity
   */
  private calculateROIScore(
    estimatedIncome: { min: number, max: number, timeframe: string },
    startupCost: { min: number, max: number },
    timeRequired: { min: number, max: number },
    opportunityType?: OpportunityType,
    category?: string
  ): number {
    // Default values if missing
    const income = estimatedIncome || { min: 100, max: 1000, timeframe: 'month' };
    const cost = startupCost || { min: 0, max: 100 };
    const time = timeRequired || { min: 5, max: 20 };
    
    // Get market demand if we have opportunity type
    let marketDemandScore = 0.5; // Default medium demand
    if (opportunityType) {
      marketDemandScore = marketDataService.calculateMarketDemandScore(opportunityType, category || 'general');
    }
    
    // Calculate average values
    const avgIncome = (income.min + income.max) / 2;
    const avgCost = (cost.min + cost.max) / 2;
    const avgTime = (time.min + time.max) / 2;
    
    // Convert income to monthly
    let monthlyIncome = avgIncome;
    const timeframe = income.timeframe.toLowerCase();
    if (timeframe.includes('hour')) monthlyIncome = avgIncome * 160; // 40hrs/week * 4 weeks
    if (timeframe.includes('day')) monthlyIncome = avgIncome * 20; // 5 days * 4 weeks
    if (timeframe.includes('week')) monthlyIncome = avgIncome * 4;
    if (timeframe.includes('year')) monthlyIncome = avgIncome / 12;
    if (timeframe.includes('project')) monthlyIncome = avgIncome / 3; // Assume 3 months per project
    
    // Calculate ROI components
    const costFactor = avgCost === 0 ? 1 : 1000 / (avgCost + 1000); // Higher cost = lower score
    const timeFactor = 1 - (avgTime / 40); // More time = lower score
    const incomeFactor = Math.min(1, monthlyIncome / 5000); // Cap at $5000/month for scoring
    
    // Combined weighted ROI score (0-100)
    const weightedScore = (
      incomeFactor * 0.5 + 
      costFactor * 0.15 + 
      timeFactor * 0.15 + 
      marketDemandScore * 0.2
    ) * 100;
    
    // Ensure within 0-100 range and round to integer
    return Math.round(Math.min(100, Math.max(0, weightedScore)));
  }
  
  /**
   * Calculate estimated skill gap in days
   */
  private calculateSkillGapDays(
    requiredSkills: string[],
    niceToHaveSkills: string[],
    userSkills: string[]
  ): number {
    // Use the skill graph to calculate a more accurate skill gap
    const { days } = skillGraph.calculateSkillGapDays(
      requiredSkills || [], 
      niceToHaveSkills || [], 
      userSkills || []
    );
    
    return days;
  }
  
  /**
   * Estimate time to first revenue based on opportunity type and entry barrier
   */
  private estimateTimeToFirstRevenue(
    opportunityType: OpportunityType,
    entryBarrier: RiskLevel,
    skillGapDays: number
  ): string {
    // Get time to first revenue from market data service
    // Base days on opportunity type as the main category
    const baseDays = marketDataService.getTimeToFirstRevenue(opportunityType);
    
    // Adjust based on entry barrier
    const barrierMultiplier = entryBarrier === RiskLevel.HIGH ? 1.5 :
                              entryBarrier === RiskLevel.MEDIUM ? 1.25 : 1;
    
    // Adjust based on skill gap (if significant)
    const skillGapMultiplier = skillGapDays > 30 ? 1.5 :
                               skillGapDays > 14 ? 1.25 : 1;
    
    // Calculate adjusted range
    const minDays = Math.ceil(baseDays * 0.7); // 30% less than average
    const maxDays = Math.ceil(baseDays * 1.3); // 30% more than average
    
    const adjustedMin = Math.ceil(minDays * barrierMultiplier);
    const adjustedMax = Math.ceil(maxDays * skillGapMultiplier);
    
    // Format the range as a readable string
    if (adjustedMax < 14) {
      return `${adjustedMin}-${adjustedMax} days`;
    } else if (adjustedMax < 30) {
      return `${Math.ceil(adjustedMin / 7)}-${Math.ceil(adjustedMax / 7)} weeks`;
    } else {
      return `${Math.ceil(adjustedMin / 30)}-${Math.ceil(adjustedMax / 30)} months`;
    }
  }
  
  /**
   * Format time availability for the prompt
   */
  private formatTimeAvailability(timeAvailability: string): string {
    if (!timeAvailability || timeAvailability === 'any') {
      return 'Flexible';
    }
    
    const timeLower = timeAvailability.toLowerCase();
    if (timeLower.includes('full')) return 'Full-time (40 hours/week)';
    if (timeLower.includes('part')) return 'Part-time (15-20 hours/week)';
    if (timeLower.includes('evenings')) return 'Evenings only (10-15 hours/week)';
    if (timeLower.includes('weekends')) return 'Weekends only (10-15 hours/week)';
    
    // Try to extract hours
    const hours = parseInt(timeAvailability);
    if (!isNaN(hours)) return `${hours} hours per week`;
    
    return timeAvailability;
  }
  
  /**
   * Format risk level for the prompt
   */
  private formatRiskLevel(riskLevel: string): string {
    if (!riskLevel || riskLevel === 'any') {
      return 'Moderate risk tolerance';
    }
    
    const riskLower = riskLevel.toLowerCase();
    if (riskLower === 'low') return 'Low risk tolerance - prefers stable, proven options';
    if (riskLower === 'high') return 'High risk tolerance - open to more speculative opportunities';
    
    return 'Moderate risk tolerance';
  }
  
  /**
   * Validate opportunity type and ensure it's a valid enum value
   */
  private validateOpportunityType(type: string): OpportunityType {
    if (!type) return OpportunityType.FREELANCE;
    
    const normalizedType = type.toUpperCase();
    
    if (Object.values(OpportunityType).includes(normalizedType as OpportunityType)) {
      return normalizedType as OpportunityType;
    }
    
    // Map common variations to enum values
    const typeMap: Record<string, OpportunityType> = {
      'FREELANCING': OpportunityType.FREELANCE,
      'GIG': OpportunityType.FREELANCE,
      'PRODUCT': OpportunityType.DIGITAL_PRODUCT,
      'DIGITAL': OpportunityType.DIGITAL_PRODUCT,
      'CONTENT_CREATION': OpportunityType.CONTENT,
      'WRITING': OpportunityType.CONTENT,
      'SERVICES': OpportunityType.SERVICE,
      'CONSULTING': OpportunityType.SERVICE,
      'PASSIVE_INCOME': OpportunityType.PASSIVE,
      'COURSE': OpportunityType.INFO_PRODUCT,
      'COACHING': OpportunityType.INFO_PRODUCT,
      'TEACHING': OpportunityType.INFO_PRODUCT
    };
    
    return typeMap[normalizedType] || OpportunityType.FREELANCE;
  }
  
  /**
   * Validate risk level and ensure it's a valid enum value
   */
  private validateRiskLevel(level: string): RiskLevel {
    if (!level) return RiskLevel.MEDIUM;
    
    const normalizedLevel = level.toUpperCase();
    
    if (Object.values(RiskLevel).includes(normalizedLevel as RiskLevel)) {
      return normalizedLevel as RiskLevel;
    }
    
    if (normalizedLevel === 'LOW' || normalizedLevel === 'MINIMAL' || normalizedLevel === 'EASY') {
      return RiskLevel.LOW;
    }
    
    if (normalizedLevel === 'HIGH' || normalizedLevel === 'DIFFICULT' || normalizedLevel === 'CHALLENGING') {
      return RiskLevel.HIGH;
    }
    
    return RiskLevel.MEDIUM;
  }
  
  /**
   * Provide fallback opportunities if the AI fails
   */
  private getFallbackOpportunities(
    preferences: DiscoveryPreferences,
    count: number
  ): RawOpportunity[] {
    logger.info(`Using fallback opportunities since Anthropic API failed`);
    
    // Create basic opportunity templates
    const opportunityTypes = [
      OpportunityType.FREELANCE,
      OpportunityType.DIGITAL_PRODUCT,
      OpportunityType.CONTENT,
      OpportunityType.SERVICE,
      OpportunityType.INFO_PRODUCT
    ];
    
    // Create one opportunity per type up to the requested count
    return opportunityTypes.slice(0, count).map(type => {
      const title = `${type.charAt(0) + type.slice(1).toLowerCase()} Opportunity`;
      const entryBarrier = RiskLevel.MEDIUM;
      const category = this.deriveCategoryFromSkills(preferences.skills);
      
      // Get realistic income range from market data
      const estimatedIncome = marketDataService.calculateIncomeRange(category, type);
      
      // Calculate skill gap using skill graph
      const skillGapDays = this.calculateSkillGapDays(
        preferences.skills.slice(0, 3), // Use first 3 skills as required
        preferences.skills.slice(3, 5), // Use next 2 as nice-to-have
        preferences.skills             // Compare against all skills (will find missing ones)
      );
      
      // Get realistic time to first revenue estimate
      const timeToFirstRevenue = this.estimateTimeToFirstRevenue(
        type,
        entryBarrier,
        skillGapDays
      );
      
      // Calculate ROI score
      const roiScore = this.calculateROIScore(
        estimatedIncome,
        { min: 100, max: 500 },
        { min: 10, max: 20 },
        type,
        category
      );
      
      // Calculate market demand
      const marketDemandScore = marketDataService.calculateMarketDemandScore(type, category);
      const marketDemand = marketDemandScore > 0.7 ? 'HIGH' : marketDemandScore > 0.4 ? 'MEDIUM' : 'LOW';
      
      return {
        id: generateOpportunityId('fallback', type.toLowerCase()),
        source: 'anthropic-fallback',
        title,
        description: `A ${type.toLowerCase()} opportunity based on your ${category} skills.`,
        requiredSkills: preferences.skills.slice(0, 3),
        niceToHaveSkills: preferences.skills.slice(3, 5),
        type,
        estimatedIncome,
        startupCost: { min: 100, max: 500 },
        timeRequired: { min: 10, max: 20 },
        entryBarrier,
        marketDemand,
        stepsToStart: [
          'Research the market',
          'Develop your skills',
          'Create a portfolio',
          'Find your first client'
        ],
        successStories: [{
          name: 'John Doe',
          background: 'Started with similar skills',
          journey: 'Built a client base over 6 months',
          outcome: `Now earns $${estimatedIncome.min}-${estimatedIncome.max} per ${estimatedIncome.timeframe}`
        }],
        resources: [
          { title: 'Getting Started Guide', url: 'https://example.com/guide' },
          { title: 'Industry Overview', url: 'https://example.com/overview' }
        ],
        skillGapDays,
        matchScore: 0.7,
        timeToFirstRevenue,
        roiScore
      };
    });
  }
  
  /**
   * Derive a category from skills to use with market data
   */
  private deriveCategoryFromSkills(skills: string[]): string {
    // Default category
    let category = 'general';
    
    // Check for common categories in skills
    const allSkills = skills.join(' ').toLowerCase();
    
    if (allSkills.includes('design') || allSkills.includes('photoshop') || allSkills.includes('illustrator')) {
      category = 'design';
    } else if (allSkills.includes('write') || allSkills.includes('content') || allSkills.includes('blog')) {
      category = 'writing';
    } else if (allSkills.includes('code') || allSkills.includes('program') || allSkills.includes('develop')) {
      category = 'web_development';
    } else if (allSkills.includes('teach') || allSkills.includes('tutor') || allSkills.includes('education')) {
      category = 'education';
    } else if (allSkills.includes('video') || allSkills.includes('youtube') || allSkills.includes('edit')) {
      category = 'video';
    } else if (allSkills.includes('market') || allSkills.includes('seo') || allSkills.includes('social')) {
      category = 'marketing';
    }
    
    return category;
  }
}

export const anthropicHelper = new AnthropicHelper();