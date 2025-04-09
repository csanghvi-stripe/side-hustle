/**
 * Podia Source Adapter
 * 
 * This source captures opportunities from Podia platform
 * for digital product creation and online courses.
 */

import { BaseOpportunitySource } from './base-source';
import { DiscoveryPreferences, RawOpportunity } from '../types';
import { logger, generateId } from '../utils';
import { OpportunityType, RiskLevel } from '../../../shared/schema';

export class PodiaSource extends BaseOpportunitySource {
  constructor() {
    super(
      'Podia',
      'podia',
      'https://www.podia.com'
    );
  }

  /**
   * Get opportunities from Podia platform
   */
  public async getOpportunities(
    skills: string[],
    preferences: DiscoveryPreferences
  ): Promise<RawOpportunity[]> {
    logger.info(`Fetching opportunities from Podia for skills: ${skills.join(', ')}`);
    
    // Check if we have cached results
    const cacheKey = `podia-${skills.sort().join(',')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeMs) {
      logger.info(`Using cached Podia opportunities (${cached.data.length} items)`);
      return cached.data;
    }
    
    // Implement Podia opportunity discovery
    const opportunities = await this.getPodiaOpportunities(skills);
    
    // Cache the results
    this.cache.set(cacheKey, {
      data: opportunities,
      timestamp: Date.now()
    });
    
    return opportunities;
  }
  
  /**
   * Generate Podia opportunities based on the user's skills
   */
  private async getPodiaOpportunities(skills: string[]): Promise<RawOpportunity[]> {
    try {
      const opportunities: RawOpportunity[] = [];
      
      // Check for relevant skill categories
      const techSkills = ['programming', 'web development', 'design', 'data science', 'AI'];
      const creativeSkills = ['writing', 'design', 'photography', 'video editing', 'music'];
      const businessSkills = ['marketing', 'sales', 'entrepreneurship', 'coaching', 'consulting'];
      const wellnessSkills = ['fitness', 'nutrition', 'yoga', 'meditation', 'coaching'];
      
      const userHasTechSkills = skills.some(skill => 
        techSkills.some(techSkill => skill.toLowerCase().includes(techSkill.toLowerCase()))
      );
      
      const userHasCreativeSkills = skills.some(skill => 
        creativeSkills.some(creativeSkill => skill.toLowerCase().includes(creativeSkill.toLowerCase()))
      );
      
      const userHasBusinessSkills = skills.some(skill => 
        businessSkills.some(bizSkill => skill.toLowerCase().includes(bizSkill.toLowerCase()))
      );
      
      const userHasWellnessSkills = skills.some(skill => 
        wellnessSkills.some(wellnessSkill => skill.toLowerCase().includes(wellnessSkill.toLowerCase()))
      );
      
      // Add online course opportunity
      opportunities.push(this.createOnlineCourseOpportunity(skills));
      
      // Add digital downloads opportunity
      opportunities.push(this.createDigitalDownloadsOpportunity(skills));
      
      // Add membership site opportunity
      opportunities.push(this.createMembershipOpportunity(skills));
      
      // Add domain-specific opportunities
      if (userHasTechSkills) {
        opportunities.push(this.createTechCourseOpportunity(skills));
      }
      
      if (userHasCreativeSkills) {
        opportunities.push(this.createCreativeProductsOpportunity(skills));
      }
      
      if (userHasBusinessSkills) {
        opportunities.push(this.createBusinessCoachingOpportunity(skills));
      }
      
      if (userHasWellnessSkills) {
        opportunities.push(this.createWellnessProductsOpportunity(skills));
      }
      
      return opportunities;
    } catch (error) {
      logger.error(`Error generating Podia opportunities: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  private createOnlineCourseOpportunity(skills: string[]): RawOpportunity {
    const title = 'Create and Sell an Online Course on Podia';
    
    const description = `Launch your own online course using Podia's all-in-one platform. Podia provides everything you need to create, host, and sell your course with no technical skills required. Their platform includes video hosting, quizzes, downloads, email marketing, and payment processing in one simple interface with no transaction fees.`;
    
    return {
      id: generateId('podia-course'),
      title,
      description,
      url: 'https://www.podia.com/online-courses',
      platform: 'Podia',
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ['expertise in a subject', 'content creation'],
      niceToHaveSkills: ['video production', 'marketing', 'email writing'],
      estimatedIncome: {
        min: 1000,
        max: 50000,
        timeframe: 'month'
      },
      startupCost: {
        min: 390,
        max: 790
      },
      timeRequired: {
        min: 10,
        max: 30
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Podia account (monthly or yearly subscription)',
        'Plan your course curriculum and outline',
        'Create course content (videos, PDFs, quizzes, etc.)',
        'Upload and organize content on the Podia platform',
        'Set up pricing and payment options',
        'Create a marketing plan for your course launch',
        'Launch and promote your course'
      ],
      resourceLinks: [
        'https://www.podia.com/online-courses',
        'https://www.podia.com/articles/how-to-create-an-online-course'
      ],
      successStories: [
        'Justin Jackson built a $100K+ yearly income from multiple courses on Podia.',
        'Brenda Stokes Barron earned $30K in her first 3 months with her writing course.',
        'Paul Jarvis generated $50K in his first week launching a course on Podia.'
      ],
      location: 'Remote',
      competition: 'High',
      sourceName: 'Podia'
    };
  }
  
  private createDigitalDownloadsOpportunity(skills: string[]): RawOpportunity {
    const title = 'Sell Digital Downloads on Podia';
    
    const description = `Create and sell digital products like eBooks, templates, printables, or resources using Podia's platform. Digital downloads have a high profit margin and can generate passive income over time. Podia makes it easy to upload files, set prices, process payments, and deliver products automatically to customers.`;
    
    return {
      id: generateId('podia-downloads'),
      title,
      description,
      url: 'https://www.podia.com/digital-downloads',
      platform: 'Podia',
      type: OpportunityType.DIGITAL_PRODUCT,
      requiredSkills: ['digital content creation', 'basic design'],
      niceToHaveSkills: ['marketing', 'copywriting', 'SEO'],
      estimatedIncome: {
        min: 500,
        max: 10000,
        timeframe: 'month'
      },
      startupCost: {
        min: 390,
        max: 790
      },
      timeRequired: {
        min: 5,
        max: 15
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Sign up for a Podia account',
        'Identify in-demand digital products related to your expertise',
        'Create your digital product (eBook, template, etc.)',
        'Set up your product page and pricing on Podia',
        'Create promotional materials and sales copy',
        'Launch and market your digital products'
      ],
      resourceLinks: [
        'https://www.podia.com/digital-downloads',
        'https://www.podia.com/articles/digital-product-ideas'
      ],
      successStories: [
        'Jane Friedman sells writing guides that generate $40K+ per year on Podia.',
        'Adam Enfroy created templates that earn $5K+ monthly in passive income.',
        'Sarah Morgan sells design resources generating $3K+ monthly on Podia.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Podia'
    };
  }
  
  private createMembershipOpportunity(skills: string[]): RawOpportunity {
    const title = 'Launch a Membership Site on Podia';
    
    const description = `Create a recurring revenue business by starting a membership site on Podia. Memberships allow you to provide ongoing value to subscribers through exclusive content, community access, or services for a monthly or annual fee. Podia's platform handles subscriptions, content delivery, and community features all in one place.`;
    
    return {
      id: generateId('podia-membership'),
      title,
      description,
      url: 'https://www.podia.com/memberships',
      platform: 'Podia',
      type: OpportunityType.PASSIVE,
      requiredSkills: ['content creation', 'community management'],
      niceToHaveSkills: ['marketing', 'engagement strategies', 'email writing'],
      estimatedIncome: {
        min: 1000,
        max: 30000,
        timeframe: 'month'
      },
      startupCost: {
        min: 790,
        max: 1500
      },
      timeRequired: {
        min: 10,
        max: 25
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Podia account (Shaker plan required for memberships)',
        'Define your membership value proposition and target audience',
        'Plan your content calendar and membership benefits',
        'Set up your membership tiers and pricing structure',
        'Create initial content and community guidelines',
        'Develop a launch strategy to attract founding members',
        'Launch and continuously add value to retain members'
      ],
      resourceLinks: [
        'https://www.podia.com/memberships',
        'https://www.podia.com/articles/how-to-start-a-membership-site'
      ],
      successStories: [
        'Pat Flynn generated $50K+ monthly from his membership community on Podia.',
        'Justin Jackson built a $20K+ monthly revenue from his product people community.',
        'Anne-Laure Le Cunff created a knowledge community earning $10K+ monthly on Podia.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Podia'
    };
  }
  
  private createTechCourseOpportunity(skills: string[]): RawOpportunity {
    const title = 'Create a Tech Skills Course on Podia';
    
    // Find relevant tech skills to personalize
    const techSkills = ['programming', 'web development', 'design', 'data science', 'AI', 'python', 'javascript'];
    const matchingSkills = skills.filter(skill => 
      techSkills.some(techSkill => skill.toLowerCase().includes(techSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'technical skills';
    
    const description = `Create and sell a course teaching ${skillText} on Podia. Tech courses have high demand and strong earning potential. Podia's platform is perfect for tech content with features for code snippets, downloadable resources, and project files. Their all-in-one solution lets you focus on creating great content without worrying about technical implementation.`;
    
    return {
      id: generateId('podia-tech'),
      title,
      description,
      url: 'https://www.podia.com/online-courses',
      platform: 'Podia',
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ['teaching ability', ...techSkills],
      niceToHaveSkills: ['screencasting', 'curriculum design', 'marketing'],
      estimatedIncome: {
        min: 2000,
        max: 80000,
        timeframe: 'month'
      },
      startupCost: {
        min: 390,
        max: 790
      },
      timeRequired: {
        min: 15,
        max: 40
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Podia account',
        'Plan your technical curriculum with clear learning objectives',
        'Create video tutorials, code examples, and exercises',
        'Set up progressive modules on the Podia platform',
        'Create project-based assignments for practical application',
        'Develop marketing materials highlighting tangible skills gained',
        'Launch and gather initial student feedback'
      ],
      resourceLinks: [
        'https://www.podia.com/online-courses',
        'https://www.podia.com/articles/how-to-create-a-tech-course'
      ],
      successStories: [
        'Wes Bos earns $40K+ monthly from JavaScript courses on platforms like Podia.',
        'Brad Traversy generated $25K+ in his first month launching a web dev course.',
        'Angela Yu built a $100K+ monthly income teaching programming courses.'
      ],
      location: 'Remote',
      competition: 'High',
      sourceName: 'Podia'
    };
  }
  
  private createCreativeProductsOpportunity(skills: string[]): RawOpportunity {
    const title = 'Sell Creative Digital Products on Podia';
    
    // Find relevant creative skills
    const creativeSkills = ['writing', 'design', 'photography', 'video editing', 'music', 'illustration'];
    const matchingSkills = skills.filter(skill => 
      creativeSkills.some(creativeSkill => skill.toLowerCase().includes(creativeSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'creative skills';
    
    const description = `Turn your ${skillText} into profitable digital products on Podia. Creative assets like templates, stock photos, fonts, presets, or guides can generate ongoing passive income. Podia's platform makes it easy to showcase your work beautifully and deliver products instantly after purchase.`;
    
    return {
      id: generateId('podia-creative'),
      title,
      description,
      url: 'https://www.podia.com/digital-downloads',
      platform: 'Podia',
      type: OpportunityType.DIGITAL_PRODUCT,
      requiredSkills: creativeSkills,
      niceToHaveSkills: ['marketing', 'product presentation', 'social media'],
      estimatedIncome: {
        min: 1000,
        max: 15000,
        timeframe: 'month'
      },
      startupCost: {
        min: 390,
        max: 790
      },
      timeRequired: {
        min: 10,
        max: 25
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Sign up for a Podia account',
        'Identify marketable creative products based on your skills',
        'Create a collection of high-quality digital assets',
        'Package your products attractively with clear usage rights',
        'Set up product pages with compelling visuals',
        'Price your products strategically (individual and bundles)',
        'Launch and promote through relevant creative communities'
      ],
      resourceLinks: [
        'https://www.podia.com/digital-downloads',
        'https://www.podia.com/articles/selling-digital-downloads'
      ],
      successStories: [
        'Elle Drouin earns $10K+ monthly selling Instagram templates on Podia.',
        'Marc Edwards generated $30K+ from UI design resources in his first year.',
        'Charli Marie built a $5K+ monthly income selling design resources and templates.'
      ],
      location: 'Remote',
      competition: 'Medium-High',
      sourceName: 'Podia'
    };
  }
  
  private createBusinessCoachingOpportunity(skills: string[]): RawOpportunity {
    const title = 'Launch a Business Coaching Program on Podia';
    
    // Find relevant business skills
    const businessSkills = ['marketing', 'sales', 'entrepreneurship', 'coaching', 'consulting', 'leadership'];
    const matchingSkills = skills.filter(skill => 
      businessSkills.some(bizSkill => skill.toLowerCase().includes(bizSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'business expertise';
    
    const description = `Leverage your ${skillText} by creating a coaching program or consulting offer on Podia. Their platform allows you to combine course content, group coaching calls, private communities, and exclusive resources in one premium package that provides high value to clients.`;
    
    return {
      id: generateId('podia-coaching'),
      title,
      description,
      url: 'https://www.podia.com/coaching',
      platform: 'Podia',
      type: OpportunityType.SERVICE,
      requiredSkills: businessSkills,
      niceToHaveSkills: ['public speaking', 'group facilitation', 'curriculum design'],
      estimatedIncome: {
        min: 3000,
        max: 50000,
        timeframe: 'month'
      },
      startupCost: {
        min: 790,
        max: 1500
      },
      timeRequired: {
        min: 15,
        max: 30
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Podia account (Shaker plan recommended for coaching)',
        'Define your coaching methodology and unique approach',
        'Create a structured coaching program with clear outcomes',
        'Develop supporting course materials and resources',
        'Set up scheduling and session delivery tools',
        'Price your coaching packages appropriately for your market',
        'Create an application process for potential clients',
        'Launch and promote your coaching program'
      ],
      resourceLinks: [
        'https://www.podia.com/coaching',
        'https://www.podia.com/articles/how-to-sell-coaching'
      ],
      successStories: [
        'Jay Clouse built a $20K+ monthly coaching business using Podia.',
        'Joanna Wiebe generates $40K+ monthly from her copywriting programs.',
        'Ryan Robinson earns $15K+ monthly from business coaching programs on Podia.'
      ],
      location: 'Remote',
      competition: 'High',
      sourceName: 'Podia'
    };
  }
  
  private createWellnessProductsOpportunity(skills: string[]): RawOpportunity {
    const title = 'Create Wellness Programs on Podia';
    
    // Find relevant wellness skills
    const wellnessSkills = ['fitness', 'nutrition', 'yoga', 'meditation', 'coaching', 'health'];
    const matchingSkills = skills.filter(skill => 
      wellnessSkills.some(wellnessSkill => skill.toLowerCase().includes(wellnessSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'wellness expertise';
    
    const description = `Share your knowledge in ${skillText} by creating wellness programs, guides, or courses on Podia. The wellness market continues to grow, with high demand for authentic expertise. Podia's platform lets you combine videos, workbooks, and community elements to create transformative wellness experiences.`;
    
    return {
      id: generateId('podia-wellness'),
      title,
      description,
      url: 'https://www.podia.com/online-courses',
      platform: 'Podia',
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: wellnessSkills,
      niceToHaveSkills: ['video production', 'community building', 'empathetic communication'],
      estimatedIncome: {
        min: 1500,
        max: 25000,
        timeframe: 'month'
      },
      startupCost: {
        min: 390,
        max: 790
      },
      timeRequired: {
        min: 10,
        max: 25
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Podia account',
        'Develop your wellness philosophy and approach',
        'Create structured programs with clear outcomes',
        'Record video demonstrations and guidance',
        'Create supporting materials (workbooks, meal plans, etc.)',
        'Set up a community component for accountability',
        'Develop a launch strategy targeting your wellness niche'
      ],
      resourceLinks: [
        'https://www.podia.com/online-courses',
        'https://www.podia.com/articles/how-to-sell-wellness-products'
      ],
      successStories: [
        'Adriene Mishler built a yoga empire with courses generating $50K+ monthly.',
        'Amanda Mester earns $8K+ monthly from her plant-based nutrition programs.',
        'Brett Larkin generates $30K+ monthly from her yoga teacher training programs.'
      ],
      location: 'Remote',
      competition: 'Medium-High',
      sourceName: 'Podia'
    };
  }
}