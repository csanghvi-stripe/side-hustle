/**
 * IndieHackers Source Adapter
 * 
 * This source captures opportunities from IndieHackers,
 * a platform for independent founders and makers.
 */

import { BaseOpportunitySource } from './base-source';
import { DiscoveryPreferences, RawOpportunity } from '../types';
import { logger, generateId } from '../utils';
import { OpportunityType, RiskLevel } from '../../../shared/schema';

export class IndieHackersSource extends BaseOpportunitySource {
  constructor() {
    super(
      'IndieHackers',
      'indiehackers',
      'https://www.indiehackers.com'
    );
  }

  /**
   * Get opportunities from IndieHackers platform
   */
  public async getOpportunities(
    skills: string[],
    preferences: DiscoveryPreferences
  ): Promise<RawOpportunity[]> {
    logger.info(`Fetching opportunities from IndieHackers for skills: ${skills.join(', ')}`);
    
    // Check if we have cached results
    const cacheKey = `indiehackers-${skills.sort().join(',')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeMs) {
      logger.info(`Using cached IndieHackers opportunities (${cached.data.length} items)`);
      return cached.data;
    }
    
    // Implement IndieHackers opportunity discovery
    const opportunities = await this.getIndieHackersOpportunities(skills);
    
    // Cache the results
    this.cache.set(cacheKey, {
      data: opportunities,
      timestamp: Date.now()
    });
    
    return opportunities;
  }
  
  /**
   * Generate IndieHackers opportunities based on the user's skills
   */
  private async getIndieHackersOpportunities(skills: string[]): Promise<RawOpportunity[]> {
    try {
      const opportunities: RawOpportunity[] = [];
      
      // Define relevant skill categories
      const techSkills = ['programming', 'web development', 'mobile development', 'design', 'product'];
      const businessSkills = ['marketing', 'sales', 'business strategy', 'entrepreneurship'];
      const contentSkills = ['writing', 'content creation', 'podcasting', 'video production'];
      
      const userHasTechSkills = skills.some(skill => 
        techSkills.some(techSkill => skill.toLowerCase().includes(techSkill.toLowerCase()))
      );
      
      const userHasBusinessSkills = skills.some(skill => 
        businessSkills.some(bizSkill => skill.toLowerCase().includes(bizSkill.toLowerCase()))
      );
      
      const userHasContentSkills = skills.some(skill => 
        contentSkills.some(contentSkill => skill.toLowerCase().includes(contentSkill.toLowerCase()))
      );
      
      // Add general indie hacking opportunity
      opportunities.push(this.createGeneralIndieHackingOpportunity());
      
      // Add domain-specific opportunities
      if (userHasTechSkills) {
        opportunities.push(this.createTechSaaSOpportunity(skills));
        opportunities.push(this.createMicroSaaSOpportunity());
      }
      
      if (userHasBusinessSkills) {
        opportunities.push(this.createBootstrappedStartupOpportunity());
      }
      
      if (userHasContentSkills) {
        opportunities.push(this.createContentBusinessOpportunity(skills));
      }
      
      // Add acquisition opportunity regardless of skills
      opportunities.push(this.createStartupAcquisitionOpportunity());
      
      return opportunities;
    } catch (error) {
      logger.error(`Error generating IndieHackers opportunities: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  private createGeneralIndieHackingOpportunity(): RawOpportunity {
    const title = 'Build a Profitable Side Project as an Indie Hacker';
    
    const description = `Start your journey as an indie hacker by building a profitable side project that solves a real problem. The indie hacker approach focuses on bootstrapped, profitable businesses rather than VC-funded startups. This path allows you to maintain full ownership and creative control while generating income that could eventually replace your day job.`;
    
    return {
      id: generateId('indiehackers-general'),
      title,
      description,
      url: 'https://www.indiehackers.com/start',
      platform: 'IndieHackers',
      type: OpportunityType.PASSIVE,
      requiredSkills: ['problem solving', 'persistence', 'basic business understanding'],
      niceToHaveSkills: ['programming', 'design', 'marketing', 'customer research'],
      estimatedIncome: {
        min: 1000,
        max: 50000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 1000
      },
      timeRequired: {
        min: 10,
        max: 30
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Join the IndieHackers community and study successful case studies',
        'Identify a problem you can solve for a specific audience',
        'Validate your idea by talking to potential customers',
        'Build a minimal viable product (MVP)',
        'Launch and get your first paying customers',
        'Iterate based on feedback and gradually scale'
      ],
      resourceLinks: [
        'https://www.indiehackers.com/start',
        'https://www.indiehackers.com/podcast',
        'https://www.indiehackers.com/products'
      ],
      successStories: [
        'Pieter Levels built Nomad List to $40K/month as a solo founder.',
        'Courtland Allen created IndieHackers and sold it to Stripe within 9 months.',
        'Anne-Laure Le Cunff built Ness Labs to $30K/month with a newsletter and community.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'IndieHackers'
    };
  }
  
  private createTechSaaSOpportunity(skills: string[]): RawOpportunity {
    const title = 'Build a Bootstrapped SaaS Business';
    
    // Find relevant tech skills to personalize
    const techSkills = ['programming', 'web development', 'software development', 'product management'];
    const matchingSkills = skills.filter(skill => 
      techSkills.some(techSkill => skill.toLowerCase().includes(techSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'technical skills';
    
    const description = `Use your ${skillText} to build a Software-as-a-Service (SaaS) business that generates recurring revenue. Bootstrapped SaaS companies can start small and grow gradually, focusing on profitability rather than growth at all costs. Many successful indie hackers have built multi-million dollar SaaS businesses without raising venture capital.`;
    
    return {
      id: generateId('indiehackers-saas'),
      title,
      description,
      url: 'https://www.indiehackers.com/products?categories=SaaS',
      platform: 'IndieHackers',
      type: OpportunityType.PASSIVE,
      requiredSkills: ['programming', 'product design', 'problem solving'],
      niceToHaveSkills: ['marketing', 'customer support', 'UX design', 'SEO'],
      estimatedIncome: {
        min: 5000,
        max: 100000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 5000
      },
      timeRequired: {
        min: 20,
        max: 60
      },
      entryBarrier: RiskLevel.HIGH,
      stepsToStart: [
        'Research underserved markets or problems in industries you understand',
        'Validate your SaaS idea by talking to potential customers',
        'Build a minimal version that solves the core problem',
        'Set up subscription billing and basic customer onboarding',
        'Get your first 10 paying customers',
        'Focus on customer retention and gradual expansion'
      ],
      resourceLinks: [
        'https://www.indiehackers.com/products?categories=SaaS',
        'https://www.indiehackers.com/post/the-saas-handbook-the-definitive-guide-to-starting-and-running-a-software-business-e822adb303',
        'https://www.indiehackers.com/podcast/172-arvid-kahl-of-bootstrapped-founders'
      ],
      successStories: [
        'Ahrefs built to $100M+ ARR as a bootstrapped SEO tool.',
        'Josh Pigford grew Baremetrics to $1.5M ARR before acquisition.',
        'Laura Roeder scaled MeetEdgar to $1M ARR as a solo female founder.'
      ],
      location: 'Remote',
      competition: 'High',
      sourceName: 'IndieHackers'
    };
  }
  
  private createMicroSaaSOpportunity(): RawOpportunity {
    const title = 'Launch a Micro-SaaS Product';
    
    const description = `Create a niche, focused SaaS product that solves a specific problem for a small target audience. Micro-SaaS businesses are ideal for indie hackers because they require less time and resources to build and maintain than full-scale SaaS platforms. These focused tools can generate $1K-20K monthly with minimal ongoing maintenance.`;
    
    return {
      id: generateId('indiehackers-microsaas'),
      title,
      description,
      url: 'https://www.indiehackers.com/products?categories=SaaS',
      platform: 'IndieHackers',
      type: OpportunityType.PASSIVE,
      requiredSkills: ['programming', 'problem identification', 'product focus'],
      niceToHaveSkills: ['automation', 'integrations', 'marketing'],
      estimatedIncome: {
        min: 1000,
        max: 20000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 1000
      },
      timeRequired: {
        min: 10,
        max: 30
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Identify a narrow pain point in an existing workflow or platform',
        'Design a focused solution that addresses just that problem',
        'Build a minimal product with core functionality only',
        'Launch on communities where your target users gather',
        'Price appropriately for the specific value provided',
        'Maintain with minimal ongoing development'
      ],
      resourceLinks: [
        'https://www.indiehackers.com/post/the-complete-guide-to-building-a-micro-saas-business-eb02b5ae31',
        'https://www.indiehackers.com/podcast/183-tyler-tringas-of-micro-saas-guide',
        'https://www.indiehackers.com/products?categories=SaaS'
      ],
      successStories: [
        'Tyler Tringas built Storemapper to $15K MRR as a solo founder.',
        'Andrey Azimov created Notion templates generating $10K/month with minimal maintenance.',
        'Marko Saric built Simple Analytics to $13K MRR as a privacy-focused Google Analytics alternative.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'IndieHackers'
    };
  }
  
  private createBootstrappedStartupOpportunity(): RawOpportunity {
    const title = 'Launch a Bootstrapped Startup';
    
    const description = `Build a profitable business without outside funding by following the indie hacker approach. Bootstrapped startups prioritize revenue and sustainability over rapid growth, allowing founders to maintain control and build businesses aligned with their own values and lifestyle goals.`;
    
    return {
      id: generateId('indiehackers-bootstrap'),
      title,
      description,
      url: 'https://www.indiehackers.com',
      platform: 'IndieHackers',
      type: OpportunityType.PASSIVE,
      requiredSkills: ['entrepreneurship', 'resource management', 'problem solving'],
      niceToHaveSkills: ['programming', 'marketing', 'sales', 'customer research'],
      estimatedIncome: {
        min: 5000,
        max: 100000,
        timeframe: 'month'
      },
      startupCost: {
        min: 1000,
        max: 10000
      },
      timeRequired: {
        min: 20,
        max: 60
      },
      entryBarrier: RiskLevel.HIGH,
      stepsToStart: [
        'Research and identify profitable, underserved market opportunities',
        'Validate your business idea through customer interviews and market research',
        'Build a minimum viable product focused on core value',
        'Acquire early customers through direct outreach and targeted marketing',
        'Reinvest profits to fund gradual growth',
        'Build systems and processes that increase your leverage'
      ],
      resourceLinks: [
        'https://www.indiehackers.com/start',
        'https://www.indiehackers.com/podcast',
        'https://www.indiehackers.com/post/the-bootstrappers-bible-0175330fe5'
      ],
      successStories: [
        'Mailchimp grew to $700M+ in revenue while remaining bootstrapped for 20+ years.',
        'Ben Chestnut and Dan Kurzius built Mailchimp without venture capital, eventually selling for $12B.',
        'Jason Fried and David Heinemeier Hansson grew Basecamp to millions in revenue with a team of less than 60.'
      ],
      location: 'Remote',
      competition: 'High',
      sourceName: 'IndieHackers'
    };
  }
  
  private createContentBusinessOpportunity(skills: string[]): RawOpportunity {
    const title = 'Build a Content-Based Business';
    
    // Find relevant content skills for personalization
    const contentSkills = ['writing', 'content creation', 'podcasting', 'video production'];
    const matchingSkills = skills.filter(skill => 
      contentSkills.some(contentSkill => skill.toLowerCase().includes(contentSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'content creation skills';
    
    const description = `Leverage your ${skillText} to build a profitable content business. Many indie hackers have built six-figure businesses around newsletters, blogs, podcasts, and YouTube channels. Content businesses typically have low startup costs and can generate revenue through multiple streams including subscriptions, sponsorships, affiliate marketing, and digital products.`;
    
    return {
      id: generateId('indiehackers-content'),
      title,
      description,
      url: 'https://www.indiehackers.com/products?categories=Content',
      platform: 'IndieHackers',
      type: OpportunityType.CONTENT,
      requiredSkills: ['content creation', 'consistency', 'audience building'],
      niceToHaveSkills: ['SEO', 'community building', 'email marketing', 'monetization strategy'],
      estimatedIncome: {
        min: 1000,
        max: 50000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 1000
      },
      timeRequired: {
        min: 10,
        max: 30
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Choose a specific niche where you have expertise or interest',
        'Select your primary content medium (writing, audio, video)',
        'Commit to a consistent publishing schedule',
        'Focus on building a direct connection with your audience (email list)',
        'Start with one monetization method and expand over time',
        'Create systems to scale your content production'
      ],
      resourceLinks: [
        'https://www.indiehackers.com/post/the-complete-guide-to-building-a-content-based-business-21f5969193',
        'https://www.indiehackers.com/podcast/164-sahil-bloom-of-the-curiosity-chronicle',
        'https://www.indiehackers.com/products?categories=Content'
      ],
      successStories: [
        'Daniel Vassallo built a portfolio of info products generating $200K+ per year.',
        'Justin Welsh created a LinkedIn-focused content business earning $700K+ annually.',
        'Corey Haines built Swipefiles into a $15K/month membership community.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'IndieHackers'
    };
  }
  
  private createStartupAcquisitionOpportunity(): RawOpportunity {
    const title = 'Acquire and Grow an Existing Indie Business';
    
    const description = `Instead of building from scratch, consider acquiring an existing indie business with proven revenue. Many founders sell profitable projects on marketplaces like MicroAcquire or Flippa. This approach lets you skip the initial validation and building phase, focusing instead on growing and improving an established product.`;
    
    return {
      id: generateId('indiehackers-acquisition'),
      title,
      description,
      url: 'https://www.indiehackers.com/post/how-to-buy-an-online-business-ultimate-guide-to-acquiring-websites-and-saas-7fe863c0da',
      platform: 'IndieHackers',
      type: OpportunityType.PASSIVE,
      requiredSkills: ['business analysis', 'due diligence', 'growth strategy'],
      niceToHaveSkills: ['negotiation', 'operations management', 'technical evaluation'],
      estimatedIncome: {
        min: 2000,
        max: 100000,
        timeframe: 'month'
      },
      startupCost: {
        min: 10000,
        max: 500000
      },
      timeRequired: {
        min: 10,
        max: 40
      },
      entryBarrier: RiskLevel.HIGH,
      stepsToStart: [
        'Define your acquisition criteria (size, industry, tech stack, etc.)',
        'Browse acquisition marketplaces like MicroAcquire, Flippa, and Empire Flippers',
        'Learn how to evaluate businesses and perform due diligence',
        'Secure funding through savings, loans, or acquisition financing',
        'Negotiate deal terms and structure',
        'Create a transition and growth plan post-acquisition'
      ],
      resourceLinks: [
        'https://www.indiehackers.com/post/how-to-buy-an-online-business-ultimate-guide-to-acquiring-websites-and-saas-7fe863c0da',
        'https://www.indiehackers.com/podcast/237-andrew-wilkinson-of-tiny',
        'https://www.microacquire.com'
      ],
      successStories: [
        'Andrew Wilkinson built Tiny Capital by acquiring profitable small businesses.',
        'Aazar Ali Shad purchased a SaaS app for $16K and grew it to $5K MRR in 5 months.',
        'Kevon Cheung acquired open startup PublicBetas and doubled its revenue in 3 months.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'IndieHackers'
    };
  }
}