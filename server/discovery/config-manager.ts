/**
 * Configuration Management System
 * 
 * This module centralizes all configuration parameters for the discovery system,
 * making them dynamically adjustable and trackable. It replaces hard-coded values
 * throughout the codebase with a single source of truth that can be updated based
 * on performance data and user outcomes.
 */

import { logger } from './utils';
import { RiskLevel, OpportunityType } from '../../shared/schema';

interface ConfigItem<T> {
  value: T;
  description: string;
  defaultValue: T;
  lastModified?: Date;
}

export class ConfigManager {
  private configs: Map<string, ConfigItem<any>> = new Map();
  
  constructor() {
    // Initialize with default values
    this.registerConfig('mlEngine.weights.skill', 2.2, 'Weight for skill match in ML scoring');
    this.registerConfig('mlEngine.weights.income', 1.5, 'Weight for income match in ML scoring');
    this.registerConfig('mlEngine.weights.time', 1.2, 'Weight for time match in ML scoring');
    this.registerConfig('mlEngine.weights.risk', 1.2, 'Weight for risk match in ML scoring');
    this.registerConfig('mlEngine.weights.diversity', 0.8, 'Weight for diversity in results');
    this.registerConfig('mlEngine.weights.popularity', 0.7, 'Weight for community validation');
    this.registerConfig('mlEngine.weights.timeToRevenue', 1.3, 'Weight for time to revenue importance');
    
    // Skill gap calculation parameters
    this.registerConfig('skillGap.requiredSkillDaysMin', 7, 'Minimum days to learn a required skill');
    this.registerConfig('skillGap.requiredSkillDaysMax', 21, 'Maximum days to learn a required skill');
    this.registerConfig('skillGap.niceToHaveSkillDaysMin', 3, 'Minimum days to learn a nice-to-have skill');
    this.registerConfig('skillGap.niceToHaveSkillDaysMax', 7, 'Maximum days to learn a nice-to-have skill');
    
    // ROI calculation parameters
    this.registerConfig('roi.incomeFactor', 0.6, 'Weight for income in ROI calculation');
    this.registerConfig('roi.costFactor', 0.2, 'Weight for cost in ROI calculation');
    this.registerConfig('roi.timeFactor', 0.2, 'Weight for time in ROI calculation');
    this.registerConfig('roi.incomeMax', 5000, 'Maximum monthly income for normalization');
    
    // Time to revenue parameters for each opportunity type
    this.registerConfig('timeToRevenue.FREELANCE.min', 7, 'Minimum days to first revenue for freelance');
    this.registerConfig('timeToRevenue.FREELANCE.max', 30, 'Maximum days to first revenue for freelance');
    this.registerConfig('timeToRevenue.SERVICE.min', 7, 'Minimum days to first revenue for service');
    this.registerConfig('timeToRevenue.SERVICE.max', 30, 'Maximum days to first revenue for service');
    this.registerConfig('timeToRevenue.DIGITAL_PRODUCT.min', 30, 'Minimum days to first revenue for digital product');
    this.registerConfig('timeToRevenue.DIGITAL_PRODUCT.max', 90, 'Maximum days to first revenue for digital product');
    this.registerConfig('timeToRevenue.CONTENT.min', 14, 'Minimum days to first revenue for content');
    this.registerConfig('timeToRevenue.CONTENT.max', 60, 'Maximum days to first revenue for content');
    this.registerConfig('timeToRevenue.PASSIVE.min', 30, 'Minimum days to first revenue for passive income');
    this.registerConfig('timeToRevenue.PASSIVE.max', 120, 'Maximum days to first revenue for passive income');
    this.registerConfig('timeToRevenue.INFO_PRODUCT.min', 30, 'Minimum days to first revenue for info product');
    this.registerConfig('timeToRevenue.INFO_PRODUCT.max', 90, 'Maximum days to first revenue for info product');
    
    // Cache parameters
    this.registerConfig('cache.sourceTimeout', 30000, 'Timeout for source requests in ms');
    this.registerConfig('cache.expirationMs', 30 * 60 * 1000, 'Cache expiration time in ms');
    this.registerConfig('cache.cleanupIntervalMs', 15 * 60 * 1000, 'Cache cleanup interval in ms');
    
    logger.info(`Initialized configuration manager with ${this.configs.size} parameters`);
  }
  
  /**
   * Register a new configuration
   */
  private registerConfig<T>(key: string, defaultValue: T, description: string): void {
    this.configs.set(key, {
      value: defaultValue,
      description,
      defaultValue
    });
  }
  
  /**
   * Get a configuration value
   */
  public get<T>(key: string): T {
    const config = this.configs.get(key);
    if (!config) {
      logger.warn(`Configuration key not found: ${key}, using null as fallback`);
      return null as unknown as T;
    }
    return config.value as T;
  }
  
  /**
   * Get all weights for ML engine
   */
  public getMLWeights(): Record<string, number> {
    return {
      skill: this.get('mlEngine.weights.skill'),
      income: this.get('mlEngine.weights.income'),
      time: this.get('mlEngine.weights.time'),
      risk: this.get('mlEngine.weights.risk'),
      diversity: this.get('mlEngine.weights.diversity'),
      popularity: this.get('mlEngine.weights.popularity'),
      timeToRevenue: this.get('mlEngine.weights.timeToRevenue')
    };
  }
  
  /**
   * Get time to revenue range for a specific opportunity type
   */
  public getTimeToRevenueRange(opportunityType: string): [number, number] {
    const typeKey = opportunityType.toUpperCase();
    return [
      this.get(`timeToRevenue.${typeKey}.min`) || 30,
      this.get(`timeToRevenue.${typeKey}.max`) || 90
    ];
  }
  
  /**
   * Update a configuration
   */
  public update<T>(key: string, value: T): void {
    const config = this.configs.get(key);
    if (config) {
      config.value = value;
      config.lastModified = new Date();
      logger.info(`Updated configuration: ${key} = ${JSON.stringify(value)}`);
    } else {
      logger.warn(`Attempted to update non-existent configuration: ${key}`);
    }
  }
  
  /**
   * Reset a configuration to its default value
   */
  public reset(key: string): void {
    const config = this.configs.get(key);
    if (config) {
      config.value = config.defaultValue;
      config.lastModified = new Date();
      logger.info(`Reset configuration: ${key} to default: ${JSON.stringify(config.defaultValue)}`);
    }
  }
  
  /**
   * Get all configuration items
   */
  public getAllConfigs(): Record<string, ConfigItem<any>> {
    const result: Record<string, ConfigItem<any>> = {};
    // Use Array.from to avoid iterator issues
    Array.from(this.configs.entries()).forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  }
}

export const configManager = new ConfigManager();