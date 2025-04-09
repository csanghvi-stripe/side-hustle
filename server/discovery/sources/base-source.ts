/**
 * Base class for all opportunity sources
 */

import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils";
import { 
  OpportunitySource, 
  UserDiscoveryInput, 
  RawOpportunity,
  OpportunityType
} from "../types";

/**
 * Base implementation for all opportunity sources
 */
export abstract class BaseOpportunitySource implements OpportunitySource {
  id: string;
  name: string;
  url: string;
  type: OpportunityType;
  logo?: string;
  apiKey?: string;
  active: boolean;
  
  constructor(
    id: string,
    name: string,
    url: string,
    type: OpportunityType,
    options: {
      logo?: string;
      apiKey?: string;
      active?: boolean;
    } = {}
  ) {
    this.id = id;
    this.name = name;
    this.url = url;
    this.type = type;
    this.logo = options.logo;
    this.apiKey = options.apiKey;
    this.active = options.active !== undefined ? options.active : true;
  }
  
  /**
   * Main method to fetch opportunities based on user skills
   * Each source must implement this method
   */
  abstract fetchOpportunities(input: UserDiscoveryInput): Promise<RawOpportunity[]>;
  
  /**
   * Validate API credentials
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.apiKey) {
      logger.warn(`No API key provided for source: ${this.name}`);
      return false;
    }
    
    try {
      const valid = await this.testApiConnection();
      
      if (!valid) {
        logger.warn(`Invalid API credentials for source: ${this.name}`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Error validating credentials for ${this.name}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Test the API connection
   * Each source should implement this method
   */
  protected abstract testApiConnection(): Promise<boolean>;
  
  /**
   * Create a raw opportunity object with source information
   */
  protected createOpportunity(data: Partial<RawOpportunity>): RawOpportunity {
    return {
      sourceId: this.id,
      sourceName: this.name,
      title: '',
      description: '',
      type: this.type,
      skillsRequired: [],
      estimatedIncome: {
        min: 0,
        max: 0,
        timeframe: 'monthly'
      },
      startupCost: {
        min: 0,
        max: 0
      },
      timeCommitment: {
        min: 0,
        max: 0,
        timeframe: 'weekly'
      },
      location: 'remote',
      entryBarrier: 'LOW',
      competition: 'medium',
      growth: 'stable',
      ...data
    };
  }
  
  /**
   * Handle errors consistently
   */
  protected handleError(error: any, context: string): void {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    logger.error(`Error in ${this.name} source (${context}): ${message}`);
    
    // Additional logging for debugging
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Error details: ${JSON.stringify(error.response?.data || error)}`);
    }
  }
}