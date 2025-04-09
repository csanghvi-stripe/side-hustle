/**
 * Discovery Module Entry Point
 * 
 * This file exports the discovery service and registers all available opportunity sources.
 * It's the main interface for accessing the discovery engine functionality.
 */

// Export the discovery service
export { discoveryService } from './service';

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
import { discoveryService } from './service';

// Register all opportunity sources with the discovery service
discoveryService.registerSource(new UpworkSource());
discoveryService.registerSource(new GumroadSource());
discoveryService.registerSource(new SubstackSource());
discoveryService.registerSource(new MavenSource());
discoveryService.registerSource(new PodiaSource());
discoveryService.registerSource(new TeachableSource());
discoveryService.registerSource(new KajabiSource());
discoveryService.registerSource(new ContraSource());
discoveryService.registerSource(new IndieHackersSource());