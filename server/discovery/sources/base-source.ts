/**
 * Base class for all opportunity sources
 * 
 * This provides common functionality and a standardized interface for 
 * all platform-specific opportunity sources to implement.
 */

import axios from 'axios';
import { DiscoveryPreferences, OpportunitySource, RawOpportunity, UserDiscoveryInput } from "../types";
import { logger, randomDelay, sleep } from '../utils';
import { OpportunityType, RiskLevel } from '../../../shared/schema';

export abstract class BaseOpportunitySource implements OpportunitySource {
  // Basic properties that all sources must have
  public readonly name: string;
  public readonly id: string;
  public readonly description: string;
  public capabilities: string[] = [];
  public isEnabled: boolean = true;
  protected baseUrl: string;
  protected requestDelay: number = 1000; // Time in ms between requests
  protected cacheTimeMs: number = 60 * 60 * 1000; // Default 1 hour cache
  protected cache: Map<string, {data: RawOpportunity[], timestamp: number}> = new Map();
  protected type: OpportunityType;
  protected metadata: any;
  
  constructor(
    id: string,
    name: string, 
    baseUrl: string,
    type: OpportunityType = OpportunityType.FREELANCE,
    metadata: any = {}
  ) {
    this.id = id;
    this.name = name;
    this.baseUrl = baseUrl;
    this.type = type;
    this.metadata = metadata;
    this.description = `Opportunities from ${name}`;
  }
  
  /**
   * Main method that all source implementations must provide
   */
  public abstract fetchOpportunities(
    input: UserDiscoveryInput
  ): Promise<RawOpportunity[]>;
  
  /**
   * Standard interface method that calls the source-specific implementation
   */
  public async getOpportunities(
    skills: string[], 
    preferences: DiscoveryPreferences
  ): Promise<RawOpportunity[]> {
    try {
      return await this.fetchOpportunities({
        skills,
        timeAvailability: preferences.timeAvailability || 'any',
        riskAppetite: preferences.riskAppetite || 'medium',
        incomeGoals: preferences.incomeGoals || 0,
        workPreference: preferences.workPreference,
        additionalDetails: preferences.additionalDetails,
        preferences
      });
    } catch (error) {
      this.handleError(error, 'getOpportunities');
      return [];
    }
  }
  
  /**
   * Helper for making HTTP requests with appropriate delays and error handling
   */
  protected async fetchWithRetry(
    url: string, 
    options?: { 
      method?: string, 
      headers?: Record<string, string>, 
      data?: any,
      retries?: number 
    }
  ): Promise<any> {
    const method = options?.method || 'GET';
    const headers = options?.headers || {};
    const data = options?.data;
    const retries = options?.retries || 3;
    
    // Add slight random delay to avoid rate limiting
    await randomDelay(500, 1500);
    
    try {
      const response = await axios({
        method,
        url,
        headers,
        data,
        timeout: 15000, // 15 second timeout
      });
      
      return response.data;
    } catch (err) {
      const error = err as Error;
      if (retries > 0) {
        logger.warn(`Error fetching ${url}, retrying (${retries} attempts left): ${error.message || 'Unknown error'}`);
        // Exponential backoff
        await sleep(2000 * (4 - retries));
        return this.fetchWithRetry(url, {
          ...options,
          retries: retries - 1,
        });
      }
      
      logger.error(`Failed to fetch ${url} after retries: ${error.message || 'Unknown error'}`);
      return null;
    }
  }
  
  /**
   * Shared method for categorizing risk level
   */
  protected categorizeRiskLevel(
    startupCost: number, 
    timeToFirstDollar: number, 
    competitionLevel: 'low' | 'medium' | 'high'
  ): RiskLevel {
    // Default risk is LOW
    let risk: RiskLevel = RiskLevel.LOW;
    
    // Startup cost factor
    if (startupCost > 5000) {
      risk = RiskLevel.HIGH;
    } else if (startupCost > 1000) {
      risk = RiskLevel.MEDIUM;
    }
    
    // Time to first income factor
    if (timeToFirstDollar > 90) { // More than 3 months
      risk = this.increaseRisk(risk);
    }
    
    // Competition factor
    if (competitionLevel === 'high') {
      risk = this.increaseRisk(risk);
    }
    
    return risk;
  }
  
  /**
   * Helper to increase risk level
   */
  private increaseRisk(current: RiskLevel): RiskLevel {
    if (current === RiskLevel.LOW) return RiskLevel.MEDIUM;
    if (current === RiskLevel.MEDIUM) return RiskLevel.HIGH;
    return RiskLevel.HIGH;
  }
  
  /**
   * Generate a unique id for an opportunity
   */
  protected generateOpportunityId(platform: string, uniqueIdentifier: string): string {
    return `${platform.toLowerCase()}-${uniqueIdentifier.replace(/[^a-z0-9]/gi, '-')}`;
  }
  
  /**
   * Standard error handling for all sources
   */
  public handleError(error: any, context?: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextInfo = context ? ` (${context})` : '';
    logger.error(`Error in ${this.name} source${contextInfo}: ${errorMessage}`);
  }
  
  /**
   * Helper to create a standardized opportunity object
   */
  protected createOpportunity(data: Partial<RawOpportunity>): RawOpportunity {
    // Generate a unique ID if not provided
    const id = data.id || this.generateOpportunityId(
      this.id, 
      data.title || `${Date.now()}`
    );
    
    // Return the opportunity with defaults for required fields
    return {
      id,
      title: data.title || 'Untitled Opportunity',
      description: data.description || 'No description available',
      source: this.id,
      requiredSkills: data.requiredSkills || [],
      type: data.type || this.type || OpportunityType.FREELANCE,
      url: data.url || this.baseUrl,
      estimatedIncome: data.estimatedIncome || { min: 0, max: 0, timeframe: 'monthly' },
      timeRequired: data.timeRequired || { min: 0, max: 0, timeframe: 'weekly' },
      startupCost: data.startupCost || { min: 0, max: 0 },
      entryBarrier: data.entryBarrier || RiskLevel.MEDIUM,
      stepsToStart: data.stepsToStart || ['Research the opportunity', 'Create a plan', 'Start implementation'],
      ...data
    };
  }
}