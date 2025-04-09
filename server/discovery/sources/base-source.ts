/**
 * Base class for all opportunity sources
 * 
 * This provides common functionality and a standardized interface for 
 * all platform-specific opportunity sources to implement.
 */

import axios from 'axios';
import { DiscoveryPreferences, OpportunitySource, RawOpportunity } from "../types";
import { logger, randomDelay, sleep } from '../utils';
import { OpportunityType, RiskLevel } from '../../../shared/schema';

export abstract class BaseOpportunitySource implements OpportunitySource {
  // Basic properties that all sources must have
  public readonly name: string;
  public readonly id: string;
  protected baseUrl: string;
  protected requestDelay: number = 1000; // Time in ms between requests
  protected cacheTimeMs: number = 60 * 60 * 1000; // Default 1 hour cache
  protected cache: Map<string, {data: RawOpportunity[], timestamp: number}> = new Map();
  
  constructor(name: string, id: string, baseUrl: string) {
    this.name = name;
    this.id = id;
    this.baseUrl = baseUrl;
  }
  
  /**
   * Main method that all sources must implement to get opportunities
   */
  public abstract getOpportunities(
    skills: string[], 
    preferences: DiscoveryPreferences
  ): Promise<RawOpportunity[]>;
  
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
    } catch (error) {
      if (retries > 0) {
        logger.warn(`Error fetching ${url}, retrying (${retries} attempts left): ${error.message}`);
        // Exponential backoff
        await sleep(2000 * (4 - retries));
        return this.fetchWithRetry(url, {
          ...options,
          retries: retries - 1,
        });
      }
      
      logger.error(`Failed to fetch ${url} after retries: ${error.message}`);
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
}