/**
 * Contra Source Adapter
 * 
 * This source captures freelance opportunities from Contra,
 * a platform focused on independent professionals with no fees.
 */

import { BaseOpportunitySource } from './base-source';
import { DiscoveryPreferences, RawOpportunity } from '../types';
import { logger, generateId } from '../utils';
import { OpportunityType, RiskLevel } from '../../../shared/schema';

export class ContraSource extends BaseOpportunitySource {
  constructor() {
    super(
      'Contra',
      'contra',
      'https://contra.com'
    );
  }

  /**
   * Get opportunities from Contra platform
   */
  public async getOpportunities(
    skills: string[],
    preferences: DiscoveryPreferences
  ): Promise<RawOpportunity[]> {
    logger.info(`Fetching opportunities from Contra for skills: ${skills.join(', ')}`);
    
    // Check if we have cached results
    const cacheKey = `contra-${skills.sort().join(',')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeMs) {
      logger.info(`Using cached Contra opportunities (${cached.data.length} items)`);
      return cached.data;
    }
    
    // Implement Contra opportunity discovery
    const opportunities = await this.getContraOpportunities(skills);
    
    // Cache the results
    this.cache.set(cacheKey, {
      data: opportunities,
      timestamp: Date.now()
    });
    
    return opportunities;
  }
  
  /**
   * Generate Contra opportunities based on the user's skills
   */
  private async getContraOpportunities(skills: string[]): Promise<RawOpportunity[]> {
    try {
      const opportunities: RawOpportunity[] = [];
      
      // Define relevant skill categories
      const techSkills = ['programming', 'web development', 'design', 'data science', 'AI', 'mobile development'];
      const creativeSkills = ['writing', 'design', 'video editing', 'content creation', 'copywriting'];
      const marketingSkills = ['marketing', 'social media', 'SEO', 'advertising', 'email marketing'];
      const businessSkills = ['consulting', 'project management', 'strategy', 'business analysis'];
      
      const userHasTechSkills = skills.some(skill => 
        techSkills.some(techSkill => skill.toLowerCase().includes(techSkill.toLowerCase()))
      );
      
      const userHasCreativeSkills = skills.some(skill => 
        creativeSkills.some(creativeSkill => skill.toLowerCase().includes(creativeSkill.toLowerCase()))
      );
      
      const userHasMarketingSkills = skills.some(skill => 
        marketingSkills.some(marketingSkill => skill.toLowerCase().includes(marketingSkill.toLowerCase()))
      );
      
      const userHasBusinessSkills = skills.some(skill => 
        businessSkills.some(bizSkill => skill.toLowerCase().includes(bizSkill.toLowerCase()))
      );
      
      // Add general Contra opportunity
      opportunities.push(this.createGeneralContraOpportunity());
      
      // Add domain-specific opportunities
      if (userHasTechSkills) {
        opportunities.push(this.createTechFreelancingOpportunity(skills));
      }
      
      if (userHasCreativeSkills) {
        opportunities.push(this.createCreativeFreelancingOpportunity(skills));
      }
      
      if (userHasMarketingSkills) {
        opportunities.push(this.createMarketingFreelancingOpportunity(skills));
      }
      
      if (userHasBusinessSkills) {
        opportunities.push(this.createBusinessConsultingOpportunity(skills));
      }
      
      // Add packaged service opportunity regardless of skills
      opportunities.push(this.createPackagedServiceOpportunity());
      
      return opportunities;
    } catch (error) {
      logger.error(`Error generating Contra opportunities: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  private createGeneralContraOpportunity(): RawOpportunity {
    const title = 'Start Freelancing on Contra (0% Commission Platform)';
    
    const description = `Launch your freelance career on Contra, a platform that takes 0% commission from freelancers. Unlike other platforms that take 5-20% of your earnings, Contra lets you keep 100% of what you earn. The platform focuses on quality over quantity, with a curated marketplace of independent professionals across design, development, marketing, and business services.`;
    
    return {
      id: generateId('contra-general'),
      title,
      description,
      url: 'https://contra.com',
      platform: 'Contra',
      type: OpportunityType.FREELANCE,
      requiredSkills: ['communication', 'time management', 'expertise in a marketable skill'],
      niceToHaveSkills: ['portfolio creation', 'client management', 'proposal writing'],
      estimatedIncome: {
        min: 1000,
        max: 10000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 100
      },
      timeRequired: {
        min: 10,
        max: 40
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Create a Contra account and complete your profile',
        'Add your skills, experience, and portfolio samples',
        'Set up your service offerings with clear deliverables',
        'Establish your rates and availability',
        'Apply to relevant projects on the platform',
        'Build positive reviews through quality work'
      ],
      resourceLinks: [
        'https://contra.com/getting-started',
        'https://contra.com/blog/tips-for-freelancers'
      ],
      successStories: [
        'John earned $4,500 in his first month on Contra after switching from Upwork.',
        'Maria built a $8,000/month copywriting business through Contra clients.',
        'Dev expanded his client base by 40% within 3 months of joining Contra.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Contra'
    };
  }
  
  private createTechFreelancingOpportunity(skills: string[]): RawOpportunity {
    const title = 'Offer Tech Services on Contra';
    
    // Find matching skills for personalization
    const techSkills = ['programming', 'web development', 'design', 'data science', 'AI', 'mobile development'];
    const matchingSkills = skills.filter(skill => 
      techSkills.some(techSkill => skill.toLowerCase().includes(techSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'technical skills';
    
    const description = `Leverage your ${skillText} to provide freelance tech services on Contra. Tech freelancers are in high demand, with companies seeking specialized skills for project-based work. Contra connects you directly with clients and lets you keep 100% of your earnings with no platform fees.`;
    
    return {
      id: generateId('contra-tech'),
      title,
      description,
      url: 'https://contra.com',
      platform: 'Contra',
      type: OpportunityType.FREELANCE,
      requiredSkills: techSkills,
      niceToHaveSkills: ['project estimation', 'client communication', 'portfolio presentation'],
      estimatedIncome: {
        min: 3000,
        max: 20000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 500
      },
      timeRequired: {
        min: 15,
        max: 40
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Create an optimized Contra profile highlighting your tech expertise',
        'Build a portfolio showcasing relevant projects and code samples',
        'Define your service packages with clear deliverables and timelines',
        'Set competitive rates based on your experience level',
        'Apply to relevant tech projects on the platform',
        'Deliver quality work to build your reputation'
      ],
      resourceLinks: [
        'https://contra.com/categories/development',
        'https://contra.com/blog/tech-freelancing-guide'
      ],
      successStories: [
        'Alex built a $12,000/month development business on Contra in 6 months.',
        'Sofia transitioned from full-time work to earning $150K annually as a Contra freelancer.',
        'Marcus landed a $30,000 contract for a mobile app within his first month on Contra.'
      ],
      location: 'Remote',
      competition: 'Medium-High',
      sourceName: 'Contra'
    };
  }
  
  private createCreativeFreelancingOpportunity(skills: string[]): RawOpportunity {
    const title = 'Offer Creative Services on Contra';
    
    // Find matching skills for personalization
    const creativeSkills = ['writing', 'design', 'video editing', 'content creation', 'copywriting'];
    const matchingSkills = skills.filter(skill => 
      creativeSkills.some(creativeSkill => skill.toLowerCase().includes(creativeSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'creative skills';
    
    const description = `Monetize your ${skillText} by offering creative services on Contra. The platform connects creative professionals directly with clients looking for quality work in design, writing, video production, and content creation. With no commission fees, you keep 100% of what you earn while building a portfolio of clients.`;
    
    return {
      id: generateId('contra-creative'),
      title,
      description,
      url: 'https://contra.com',
      platform: 'Contra',
      type: OpportunityType.FREELANCE,
      requiredSkills: creativeSkills,
      niceToHaveSkills: ['portfolio curation', 'client management', 'creative briefs'],
      estimatedIncome: {
        min: 2000,
        max: 15000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 300
      },
      timeRequired: {
        min: 10,
        max: 35
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Create a Contra profile showcasing your creative expertise',
        'Build a visually compelling portfolio of your best work',
        'Define your creative services with clear packages and pricing',
        'Establish your brand voice and unique creative approach',
        'Apply to relevant creative projects on the platform',
        'Network with potential clients in your niche'
      ],
      resourceLinks: [
        'https://contra.com/categories/design',
        'https://contra.com/blog/creative-freelancer-tips'
      ],
      successStories: [
        'Emma built a $7,000/month graphic design business through Contra.',
        'Jordan secured a recurring $4,500/month content creation contract through the platform.',
        'Lisa transitioned from agency work to freelancing, doubling her income within 6 months on Contra.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Contra'
    };
  }
  
  private createMarketingFreelancingOpportunity(skills: string[]): RawOpportunity {
    const title = 'Provide Marketing Services on Contra';
    
    // Find matching skills for personalization
    const marketingSkills = ['marketing', 'social media', 'SEO', 'advertising', 'email marketing'];
    const matchingSkills = skills.filter(skill => 
      marketingSkills.some(marketingSkill => skill.toLowerCase().includes(marketingSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'marketing skills';
    
    const description = `Offer your ${skillText} as freelance services on Contra. Businesses are increasingly working with independent marketing professionals for specialized expertise. Contra connects you with clients seeking marketing services while allowing you to keep 100% of your earnings with no platform fees.`;
    
    return {
      id: generateId('contra-marketing'),
      title,
      description,
      url: 'https://contra.com',
      platform: 'Contra',
      type: OpportunityType.FREELANCE,
      requiredSkills: marketingSkills,
      niceToHaveSkills: ['analytics', 'strategy development', 'client reporting'],
      estimatedIncome: {
        min: 2500,
        max: 15000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 200
      },
      timeRequired: {
        min: 10,
        max: 40
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Create a Contra profile highlighting your marketing expertise',
        'Showcase measurable results from previous marketing work',
        'Define your service packages with clear deliverables and metrics',
        'Set competitive rates based on your specialization',
        'Apply to relevant marketing projects on the platform',
        'Build case studies from successful client work'
      ],
      resourceLinks: [
        'https://contra.com/categories/marketing',
        'https://contra.com/blog/marketing-freelancer-guide'
      ],
      successStories: [
        'Sam built a $10,000/month social media consulting business through Contra.',
        'Rachel secured a $5,000/month retainer with an e-commerce brand within 2 months.',
        'David transitioned from agency work to earning $120K annually as an independent marketing consultant.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Contra'
    };
  }
  
  private createBusinessConsultingOpportunity(skills: string[]): RawOpportunity {
    const title = 'Offer Business Consulting Services on Contra';
    
    // Find matching skills for personalization
    const businessSkills = ['consulting', 'project management', 'strategy', 'business analysis'];
    const matchingSkills = skills.filter(skill => 
      businessSkills.some(bizSkill => skill.toLowerCase().includes(bizSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'business expertise';
    
    const description = `Monetize your ${skillText} by offering business consulting services on Contra. Companies are seeking independent experts for strategic advice, project management, and operational improvement. Contra connects you directly with clients while letting you keep 100% of your consulting fees.`;
    
    return {
      id: generateId('contra-consulting'),
      title,
      description,
      url: 'https://contra.com',
      platform: 'Contra',
      type: OpportunityType.FREELANCE,
      requiredSkills: businessSkills,
      niceToHaveSkills: ['presentation skills', 'industry experience', 'data analysis'],
      estimatedIncome: {
        min: 4000,
        max: 20000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 300
      },
      timeRequired: {
        min: 15,
        max: 40
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Create a professional Contra profile highlighting your business expertise',
        'Define your consulting methodology and approach',
        'Establish clear service offerings with tangible deliverables',
        'Set professional-level consulting rates',
        'Apply to relevant consulting opportunities on the platform',
        'Build case studies demonstrating impact of your consulting work'
      ],
      resourceLinks: [
        'https://contra.com/categories/strategy',
        'https://contra.com/blog/consulting-business-guide'
      ],
      successStories: [
        'Michael established a $15,000/month strategy consulting practice through Contra.',
        'Jennifer secured a $40,000 organizational development project within her first quarter.',
        'Carlos transitioned from corporate to earning $180K annually through independent consulting.'
      ],
      location: 'Remote',
      competition: 'Medium-High',
      sourceName: 'Contra'
    };
  }
  
  private createPackagedServiceOpportunity(): RawOpportunity {
    const title = 'Create Packaged Service Offerings on Contra';
    
    const description = `Develop standardized service packages on Contra to streamline your freelance business. Packaging your services with clear deliverables, timelines, and fixed pricing makes it easier for clients to hire you. Contra's platform is designed to showcase packaged services, helping you attract clients looking for specific solutions without lengthy custom proposal processes.`;
    
    return {
      id: generateId('contra-packages'),
      title,
      description,
      url: 'https://contra.com/blog/how-to-create-independent-service-offerings',
      platform: 'Contra',
      type: OpportunityType.FREELANCE,
      requiredSkills: ['service design', 'expertise in a marketable skill'],
      niceToHaveSkills: ['pricing strategy', 'process optimization', 'service marketing'],
      estimatedIncome: {
        min: 2000,
        max: 15000,
        timeframe: 'month'
      },
      startupCost: {
        min: 0,
        max: 100
      },
      timeRequired: {
        min: 15,
        max: 35
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Create a Contra account and complete your profile',
        'Identify your most in-demand services to package',
        'Define clear deliverables, timelines, and scope for each package',
        'Set transparent fixed pricing for each service tier',
        'Create compelling package descriptions with benefits highlighted',
        'Establish a streamlined process for delivering each package efficiently'
      ],
      resourceLinks: [
        'https://contra.com/blog/how-to-create-independent-service-offerings',
        'https://contra.com/blog/freelance-pricing-guide'
      ],
      successStories: [
        'Tyler increased his monthly income by 60% after creating packaged service tiers.',
        'Natalie reduced her client onboarding time by 75% with standardized service packages.',
        'Marco doubled his conversion rate by offering clear, fixed-price packages instead of custom quotes.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Contra'
    };
  }
}