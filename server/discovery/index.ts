/**
 * Discovery Module Entry Point
 * 
 * This file exports the discovery service and registers all available opportunity sources.
 * It's the main interface for accessing the discovery engine functionality.
 */

// Export the discovery service
export { discoveryService } from './service';

// Import the source classes
import { BaseOpportunitySource } from './sources/base-source';
import { discoveryService } from './service';

// Define source implementations
// This will be a minimal implementation for now

class MinimalUpworkSource extends BaseOpportunitySource {
  constructor() {
    super("Upwork", "upwork", "https://www.upwork.com");
  }
  
  async getOpportunities(skills: string[], preferences: any) {
    // For now, return empty array since we don't have actual implementation
    return [];
  }
}

class MinimalGumroadSource extends BaseOpportunitySource {
  constructor() {
    super("Gumroad", "gumroad", "https://www.gumroad.com");
  }
  
  async getOpportunities(skills: string[], preferences: any) {
    // For now, return empty array since we don't have actual implementation
    return [];
  }
}

class MinimalSubstackSource extends BaseOpportunitySource {
  constructor() {
    super("Substack", "substack", "https://substack.com");
  }
  
  async getOpportunities(skills: string[], preferences: any) {
    // For now, return empty array since we don't have actual implementation
    return [];
  }
}

// Auto-register the sources
discoveryService.registerSource(new MinimalUpworkSource());
discoveryService.registerSource(new MinimalGumroadSource());
discoveryService.registerSource(new MinimalSubstackSource());