/**
 * Source Plugin Management System
 * 
 * This module provides robust management of opportunity data sources,
 * handling errors, tracking performance metrics, and automatically
 * repairing common issues with source plugins.
 */

import { OpportunitySource } from './types';
import { logger } from './utils';

interface SourceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastError?: string;
  lastErrorTime?: Date;
  enabled: boolean;
  errorPattern?: Record<string, number>; // Track error patterns
}

export class SourceManager {
  private sources: Map<string, OpportunitySource> = new Map();
  private metrics: Map<string, SourceMetrics> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.setupHealthCheck();
    logger.info('Source Manager initialized');
  }
  
  /**
   * Register a new opportunity source
   */
  public registerSource(source: OpportunitySource): void {
    this.sources.set(source.id, source);
    this.metrics.set(source.id, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      enabled: true,
      errorPattern: {}
    });
    
    logger.info(`Registered source: ${source.id} (${source.name})`);
    
    // Add standard error handler if missing
    if (!source.handleError) {
      source.handleError = this.createErrorHandler(source.id);
      logger.info(`Added standard error handler to source: ${source.id}`);
    }
  }
  
  /**
   * Create a standardized error handler for sources
   */
  private createErrorHandler(sourceId: string) {
    return (error: Error | string): void => {
      const errorMessage = error instanceof Error ? error.message : error;
      logger.error(`Error in source ${sourceId}: ${errorMessage}`);
      
      // Update metrics
      const metric = this.metrics.get(sourceId);
      if (metric) {
        metric.failedRequests++;
        metric.lastError = errorMessage;
        metric.lastErrorTime = new Date();
        
        // Track error pattern
        if (!metric.errorPattern) metric.errorPattern = {};
        metric.errorPattern[errorMessage] = (metric.errorPattern[errorMessage] || 0) + 1;
        
        // If a specific error happens repeatedly, try to fix the source
        if (metric.errorPattern[errorMessage] >= 3) {
          this.attemptSourceRepair(sourceId, errorMessage);
        }
      }
    };
  }
  
  /**
   * Attempt to fix common issues with sources
   */
  private attemptSourceRepair(sourceId: string, errorMessage: string): void {
    const source = this.sources.get(sourceId);
    if (!source) return;
    
    logger.info(`Attempting to repair source: ${sourceId}`);
    
    if (errorMessage.includes('handleError is not a function')) {
      // Fix missing error handler
      source.handleError = this.createErrorHandler(sourceId);
      logger.info(`Added standard error handler to source: ${sourceId}`);
    }
    
    if (errorMessage.includes('getOpportunities is not a function') && typeof source.findOpportunities === 'function') {
      // Some sources might use different naming conventions
      (source as any).getOpportunities = source.findOpportunities;
      logger.info(`Added getOpportunities alias to source: ${sourceId}`);
    }
    
    if (errorMessage.includes('Cannot read property') || errorMessage.includes('Cannot read properties')) {
      // Add defensive null checks to the source methods
      const originalGetOpportunities = source.getOpportunities;
      if (originalGetOpportunities) {
        source.getOpportunities = async (...args) => {
          try {
            const result = await originalGetOpportunities.apply(source, args);
            return Array.isArray(result) ? result : [];
          } catch (err) {
            if (source.handleError) {
              source.handleError(err);
            }
            return [];
          }
        };
        logger.info(`Added defensive wrapper to getOpportunities for source: ${sourceId}`);
      }
    }
    
    // Add more repair strategies for other common errors
    
    // Reset error pattern tracking after repair
    const metric = this.metrics.get(sourceId);
    if (metric && metric.errorPattern) {
      metric.errorPattern[errorMessage] = 0;
    }
  }
  
  /**
   * Get all registered sources
   */
  public getSources(): OpportunitySource[] {
    return Array.from(this.sources.values()).filter(source => {
      const metric = this.metrics.get(source.id);
      return metric && metric.enabled;
    });
  }
  
  /**
   * Get a specific source by ID
   */
  public getSource(sourceId: string): OpportunitySource | undefined {
    return this.sources.get(sourceId);
  }
  
  /**
   * Track a successful request
   */
  public trackSuccess(sourceId: string, responseTime: number): void {
    const metric = this.metrics.get(sourceId);
    if (metric) {
      metric.totalRequests++;
      metric.successfulRequests++;
      metric.averageResponseTime = (
        (metric.averageResponseTime * (metric.successfulRequests - 1)) + responseTime
      ) / metric.successfulRequests;
    }
  }
  
  /**
   * Track a failed request
   */
  public trackFailure(sourceId: string, error: string): void {
    const metric = this.metrics.get(sourceId);
    if (metric) {
      metric.totalRequests++;
      metric.failedRequests++;
      metric.lastError = error;
      metric.lastErrorTime = new Date();
    }
  }
  
  /**
   * Get source metrics
   */
  public getSourceMetrics(): Record<string, SourceMetrics> {
    const result: Record<string, SourceMetrics> = {};
    // Use Array.from to avoid iterator issues
    Array.from(this.metrics.entries()).forEach(([sourceId, metrics]) => {
      result[sourceId] = { ...metrics };
    });
    return result;
  }
  
  /**
   * Set up periodic health checks
   */
  private setupHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Run health check every hour
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60 * 60 * 1000);
  }
  
  /**
   * Perform health check on all sources
   */
  private performHealthCheck(): void {
    logger.info('Performing source health check');
    
    // Use Array.from to avoid iterator issues
    Array.from(this.metrics.entries()).forEach(([sourceId, metric]) => {
      // Disable sources with high failure rates
      if (metric.totalRequests > 10) {
        const failureRate = metric.failedRequests / metric.totalRequests;
        
        if (failureRate > 0.8) {
          logger.warn(`Disabling source ${sourceId} due to high failure rate: ${failureRate.toFixed(2)}`);
          metric.enabled = false;
        } else if (!metric.enabled && failureRate < 0.3) {
          // Re-enable sources if failure rate improves
          logger.info(`Re-enabling source ${sourceId}, failure rate improved: ${failureRate.toFixed(2)}`);
          metric.enabled = true;
        }
      }
    });
  }
  
  /**
   * Shut down manager
   */
  public shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const sourceManager = new SourceManager();