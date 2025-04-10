/**
 * Enhanced Discovery Module Entry Point
 * 
 * This file exports the enhanced discovery service and registers all available opportunity sources.
 * It's the main interface for accessing the improved discovery engine functionality.
 */

// Export the enhanced discovery service
export { enhancedDiscoveryService as discoveryService } from './enhanced-service';

// Import source implementations
import { UpworkSource } from './sources/upwork-source';
import { GumroadSource } from './sources/gumroad-source';
import { SubstackSource } from './sources/substack-source';
import { MavenSource } from './sources/maven-source';
import { PodiaSource } from './sources/podia-source';
import { TeachableSource } from './sources/teachable-source';
import { KajabiSource } from './sources/kajabi-source';
import { ContraSource } from './sources/contra-source';
import { IndieHackersSource } from './sources/indiehackers-source';
import { enhancedDiscoveryService } from './enhanced-service';

// Register all opportunity sources with the discovery service
enhancedDiscoveryService.registerSource(new UpworkSource());
enhancedDiscoveryService.registerSource(new GumroadSource());
enhancedDiscoveryService.registerSource(new SubstackSource());
enhancedDiscoveryService.registerSource(new MavenSource());
enhancedDiscoveryService.registerSource(new PodiaSource());
enhancedDiscoveryService.registerSource(new TeachableSource());
enhancedDiscoveryService.registerSource(new KajabiSource());
enhancedDiscoveryService.registerSource(new ContraSource());
enhancedDiscoveryService.registerSource(new IndieHackersSource());

// Initialize service components
console.log('Enhanced Discovery Service (v2.0) initialized');