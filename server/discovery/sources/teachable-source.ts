/**
 * Teachable Source Adapter
 * 
 * This source captures opportunities from Teachable,
 * a platform for creating and selling online courses.
 */

import { BaseOpportunitySource } from './base-source';
import { DiscoveryPreferences, RawOpportunity } from '../types';
import { logger, generateId } from '../utils';
import { OpportunityType, RiskLevel } from '../../../shared/schema';

export class TeachableSource extends BaseOpportunitySource {
  constructor() {
    super(
      'Teachable',
      'teachable',
      'https://teachable.com'
    );
  }

  /**
   * Get opportunities from Teachable platform
   */
  public async getOpportunities(
    skills: string[],
    preferences: DiscoveryPreferences
  ): Promise<RawOpportunity[]> {
    logger.info(`Fetching opportunities from Teachable for skills: ${skills.join(', ')}`);
    
    // Check if we have cached results
    const cacheKey = `teachable-${skills.sort().join(',')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeMs) {
      logger.info(`Using cached Teachable opportunities (${cached.data.length} items)`);
      return cached.data;
    }
    
    // Implement Teachable opportunity discovery
    const opportunities = await this.getTeachableOpportunities(skills);
    
    // Cache the results
    this.cache.set(cacheKey, {
      data: opportunities,
      timestamp: Date.now()
    });
    
    return opportunities;
  }
  
  /**
   * Generate Teachable opportunities based on the user's skills
   */
  private async getTeachableOpportunities(skills: string[]): Promise<RawOpportunity[]> {
    try {
      const opportunities: RawOpportunity[] = [];
      
      // Define relevant skill categories
      const techSkills = ['programming', 'web development', 'data science', 'AI', 'design'];
      const businessSkills = ['marketing', 'entrepreneurship', 'sales', 'finance', 'management'];
      const creativeSkills = ['writing', 'design', 'photography', 'video editing', 'music'];
      const wellnessSkills = ['fitness', 'nutrition', 'yoga', 'meditation', 'coaching'];
      
      const userHasTechSkills = skills.some(skill => 
        techSkills.some(techSkill => skill.toLowerCase().includes(techSkill.toLowerCase()))
      );
      
      const userHasBusinessSkills = skills.some(skill => 
        businessSkills.some(bizSkill => skill.toLowerCase().includes(bizSkill.toLowerCase()))
      );
      
      const userHasCreativeSkills = skills.some(skill => 
        creativeSkills.some(creativeSkill => skill.toLowerCase().includes(creativeSkill.toLowerCase()))
      );
      
      const userHasWellnessSkills = skills.some(skill => 
        wellnessSkills.some(wellnessSkill => skill.toLowerCase().includes(wellnessSkill.toLowerCase()))
      );
      
      // Add general opportunity for all users
      opportunities.push(this.createGeneralTeachableOpportunity());
      
      // Add domain-specific opportunities
      if (userHasTechSkills) {
        opportunities.push(this.createTechCourseOpportunity(skills));
      }
      
      if (userHasBusinessSkills) {
        opportunities.push(this.createBusinessCourseOpportunity(skills));
      }
      
      if (userHasCreativeSkills) {
        opportunities.push(this.createCreativeCourseOpportunity(skills));
      }
      
      if (userHasWellnessSkills) {
        opportunities.push(this.createWellnessCourseOpportunity(skills));
      }
      
      // Add coaching opportunity regardless of skills
      opportunities.push(this.createCoachingBundleOpportunity());
      
      return opportunities;
    } catch (error) {
      logger.error(`Error generating Teachable opportunities: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  private createGeneralTeachableOpportunity(): RawOpportunity {
    const title = 'Create and Sell an Online Course on Teachable';
    
    const description = `Turn your knowledge into income by creating an online course on Teachable. Their platform handles all the technical aspects of hosting and selling your course, including payment processing, student management, and content delivery. With over 100,000 creators on the platform, Teachable has helped instructors earn more than $1 billion.`;
    
    return {
      id: generateId('teachable-general'),
      title,
      description,
      url: 'https://teachable.com/creators',
      platform: 'Teachable',
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ['expertise in a subject', 'teaching ability', 'content creation'],
      niceToHaveSkills: ['video production', 'marketing', 'community building'],
      estimatedIncome: {
        min: 1000,
        max: 50000,
        timeframe: 'month'
      },
      startupCost: {
        min: 348,
        max: 2988
      },
      timeRequired: {
        min: 10,
        max: 30
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Teachable account (paid plans start at $29/month)',
        'Choose your course topic and validate market demand',
        'Plan your course curriculum and learning outcomes',
        'Create course content (videos, PDFs, quizzes, etc.)',
        'Set up your school branding and design',
        'Price your course and create marketing materials',
        'Launch and promote your course'
      ],
      resourceLinks: [
        'https://teachable.com/creators',
        'https://teachable.com/blog/how-to-create-an-online-course',
        'https://teachable.com/pricing'
      ],
      successStories: [
        'Pat Flynn earned over $500K from his Power-Up Podcasting course on Teachable.',
        'Justin Jackson generated $100K+ with his Marketing for Developers course.',
        'Melyssa Griffin built a multi-million dollar business teaching courses on Teachable.'
      ],
      location: 'Remote',
      competition: 'High',
      sourceName: 'Teachable'
    };
  }
  
  private createTechCourseOpportunity(skills: string[]): RawOpportunity {
    const title = 'Create a Tech Skills Course on Teachable';
    
    // Find matching skills for personalization
    const techSkills = ['programming', 'web development', 'data science', 'AI', 'design', 'mobile'];
    const matchingSkills = skills.filter(skill => 
      techSkills.some(techSkill => skill.toLowerCase().includes(techSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'technical skills';
    
    const description = `Create a comprehensive course teaching ${skillText} on Teachable. Tech courses often command premium prices due to the high value of technical skills in the job market. Teachable's platform is ideal for tech courses with features for code examples, downloadable practice files, and completion certificates.`;
    
    return {
      id: generateId('teachable-tech'),
      title,
      description,
      url: 'https://teachable.com/creators',
      platform: 'Teachable',
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ['technical expertise', 'teaching ability', 'curriculum design'],
      niceToHaveSkills: ['screen recording', 'project-based teaching', 'exercise creation'],
      estimatedIncome: {
        min: 2000,
        max: 80000,
        timeframe: 'month'
      },
      startupCost: {
        min: 348,
        max: 2988
      },
      timeRequired: {
        min: 15,
        max: 40
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Teachable account',
        'Research in-demand technical skills for your course focus',
        'Create a project-based curriculum with practical learning outcomes',
        'Develop exercises and coding challenges for hands-on practice',
        'Record video tutorials with clear explanations and demos',
        'Create supplementary resources (cheat sheets, starter files, etc.)',
        'Price your course competitively for the tech education market'
      ],
      resourceLinks: [
        'https://teachable.com/creators',
        'https://teachable.com/blog/how-to-create-a-tech-course',
        'https://teachable.com/blog/case-study-tech-course-creator'
      ],
      successStories: [
        'Wes Bos earns over $100K monthly from his various JavaScript courses.',
        'Angela Yu built a multi-million dollar business teaching programming on platforms like Teachable.',
        'Mosh Hamedani generates $50K+ monthly from his programming courses.'
      ],
      location: 'Remote',
      competition: 'High',
      sourceName: 'Teachable'
    };
  }
  
  private createBusinessCourseOpportunity(skills: string[]): RawOpportunity {
    const title = 'Create a Business Skills Course on Teachable';
    
    // Find matching skills for personalization
    const businessSkills = ['marketing', 'entrepreneurship', 'sales', 'finance', 'management'];
    const matchingSkills = skills.filter(skill => 
      businessSkills.some(bizSkill => skill.toLowerCase().includes(bizSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'business expertise';
    
    const description = `Share your ${skillText} by creating a business course on Teachable. Business courses have strong demand as people seek to advance their careers or start their own ventures. Teachable provides all the tools you need to create, market, and sell your business expertise to a global audience.`;
    
    return {
      id: generateId('teachable-business'),
      title,
      description,
      url: 'https://teachable.com/creators',
      platform: 'Teachable',
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ['business expertise', 'teaching ability', 'practical knowledge'],
      niceToHaveSkills: ['case studies', 'frameworks creation', 'actionable templates'],
      estimatedIncome: {
        min: 2000,
        max: 60000,
        timeframe: 'month'
      },
      startupCost: {
        min: 348,
        max: 2988
      },
      timeRequired: {
        min: 10,
        max: 30
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Teachable account',
        'Identify your unique business expertise and target audience',
        'Develop a results-focused curriculum with practical applications',
        'Create actionable templates, worksheets, and frameworks',
        'Record engaging course content with real-world examples',
        'Create compelling case studies demonstrating your methods',
        'Set premium pricing that reflects the business value delivered'
      ],
      resourceLinks: [
        'https://teachable.com/creators',
        'https://teachable.com/blog/how-to-create-a-business-course',
        'https://teachable.com/blog/top-business-course-ideas'
      ],
      successStories: [
        'Ramit Sethi built a 8-figure business teaching courses on earning more and starting businesses.',
        'Amy Porterfield generates millions annually with her digital course programs on Teachable.',
        'Ryan Deiss created marketing courses generating $250K+ monthly on platforms like Teachable.'
      ],
      location: 'Remote',
      competition: 'High',
      sourceName: 'Teachable'
    };
  }
  
  private createCreativeCourseOpportunity(skills: string[]): RawOpportunity {
    const title = 'Create a Creative Skills Course on Teachable';
    
    // Find matching skills for personalization
    const creativeSkills = ['writing', 'design', 'photography', 'video editing', 'music', 'art'];
    const matchingSkills = skills.filter(skill => 
      creativeSkills.some(creativeSkill => skill.toLowerCase().includes(creativeSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'creative skills';
    
    const description = `Share your ${skillText} by creating an engaging course on Teachable. Creative courses perform well because students can see clear before/after results. Teachable's platform allows you to showcase your creative work while providing step-by-step instruction with videos, downloads, and community feedback.`;
    
    return {
      id: generateId('teachable-creative'),
      title,
      description,
      url: 'https://teachable.com/creators',
      platform: 'Teachable',
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ['creative expertise', 'teaching ability', 'process breakdown'],
      niceToHaveSkills: ['demonstration', 'feedback provision', 'project design'],
      estimatedIncome: {
        min: 1000,
        max: 40000,
        timeframe: 'month'
      },
      startupCost: {
        min: 348,
        max: 2988
      },
      timeRequired: {
        min: 10,
        max: 30
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Sign up for a Teachable account',
        'Create a portfolio showcasing your creative work',
        'Design a step-by-step curriculum breaking down your creative process',
        'Record demonstration videos showing techniques in action',
        'Create downloadable resources, templates, or starter files',
        'Structure progressive projects for skill development',
        'Determine pricing tiers for different levels of course content'
      ],
      resourceLinks: [
        'https://teachable.com/creators',
        'https://teachable.com/blog/how-to-create-a-creative-course',
        'https://teachable.com/blog/creative-course-ideas'
      ],
      successStories: [
        'Joanna Penn earns $30K+ monthly from her writing courses on Teachable.',
        'Abbey Ashley built a 7-figure business teaching virtual assistant skills.',
        'David Siteman Garland generates $50K+ monthly from his course creation courses.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Teachable'
    };
  }
  
  private createWellnessCourseOpportunity(skills: string[]): RawOpportunity {
    const title = 'Create a Wellness or Personal Development Course';
    
    // Find matching skills for personalization
    const wellnessSkills = ['fitness', 'nutrition', 'yoga', 'meditation', 'coaching', 'wellness'];
    const matchingSkills = skills.filter(skill => 
      wellnessSkills.some(wellnessSkill => skill.toLowerCase().includes(wellnessSkill.toLowerCase()))
    );
    
    const skillText = matchingSkills.length > 0 
      ? matchingSkills.join(', ') 
      : 'wellness expertise';
    
    const description = `Share your ${skillText} by creating a transformational course on Teachable. Wellness courses have strong market demand as people prioritize health and personal growth. Teachable's platform allows you to combine video instruction, downloadable materials, and community support to create comprehensive wellness programs.`;
    
    return {
      id: generateId('teachable-wellness'),
      title,
      description,
      url: 'https://teachable.com/creators',
      platform: 'Teachable',
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ['wellness expertise', 'teaching ability', 'program design'],
      niceToHaveSkills: ['motivation techniques', 'progress tracking', 'accountability systems'],
      estimatedIncome: {
        min: 1000,
        max: 30000,
        timeframe: 'month'
      },
      startupCost: {
        min: 348,
        max: 2988
      },
      timeRequired: {
        min: 10,
        max: 25
      },
      entryBarrier: RiskLevel.LOW,
      stepsToStart: [
        'Sign up for a Teachable account',
        'Develop your unique wellness methodology or approach',
        'Create a progressive curriculum with clear transformation goals',
        'Record instructional videos demonstrating techniques',
        'Create supporting materials like workbooks or tracking tools',
        'Design accountability elements to support student success',
        'Price your course based on the transformation value provided'
      ],
      resourceLinks: [
        'https://teachable.com/creators',
        'https://teachable.com/blog/how-to-create-a-wellness-course',
        'https://teachable.com/blog/wellness-course-ideas'
      ],
      successStories: [
        'Adriene Mishler built a yoga empire with courses generating $50K+ monthly.',
        'Mark Manson created personal development courses generating over $100K monthly.',
        'Tara Stiles created yoga and wellness courses earning $30K+ per month.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Teachable'
    };
  }
  
  private createCoachingBundleOpportunity(): RawOpportunity {
    const title = 'Create a Course + Coaching Bundle on Teachable';
    
    const description = `Maximize your income by combining a Teachable course with coaching services. Course + coaching bundles typically command premium prices because they combine self-paced learning with personalized guidance. Teachable's platform allows you to offer coaching services directly integrated with your course content.`;
    
    return {
      id: generateId('teachable-coaching'),
      title,
      description,
      url: 'https://teachable.com/coaching',
      platform: 'Teachable',
      type: OpportunityType.SERVICE,
      requiredSkills: ['expertise in a subject', 'coaching ability', 'course creation'],
      niceToHaveSkills: ['group facilitation', 'accountability systems', 'outcome measurement'],
      estimatedIncome: {
        min: 3000,
        max: 50000,
        timeframe: 'month'
      },
      startupCost: {
        min: 828,
        max: 2988
      },
      timeRequired: {
        min: 15,
        max: 30
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        'Sign up for a Teachable Professional or Business plan',
        'Create your core course content for self-paced learning',
        'Design your coaching offer (1:1 sessions, group calls, etc.)',
        'Set up booking calendar and session management',
        'Create packages that combine course access with different coaching levels',
        'Price your coaching bundles at a premium rate',
        'Develop systems to efficiently deliver coaching alongside course content'
      ],
      resourceLinks: [
        'https://teachable.com/coaching',
        'https://teachable.com/blog/how-to-create-a-coaching-program',
        'https://teachable.com/blog/coaching-business-case-studies'
      ],
      successStories: [
        'Jenny Blake earns $20K+ monthly from her Pivot coaching and course bundles.',
        'Todd Herman generates $100K+ from his coaching programs and courses.',
        'Marie Forleo built a multi-million dollar business with premium coaching programs.'
      ],
      location: 'Remote',
      competition: 'Medium',
      sourceName: 'Teachable'
    };
  }
}