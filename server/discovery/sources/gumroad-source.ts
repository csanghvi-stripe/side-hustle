/**
 * Gumroad integration for digital product opportunities
 */

import axios from "axios";
import { BaseOpportunitySource } from "./base-source";
import { UserDiscoveryInput, RawOpportunity, DiscoveryPreferences } from "../types";
import { logger } from "../utils";

/**
 * GumroadSource class for discovering digital product opportunities
 */
export class GumroadSource extends BaseOpportunitySource {
  private axiosInstance;
  
  constructor(apiKey?: string) {
    super(
      'Gumroad',
      'gumroad',
      'https://app.gumroad.com'
    );
    
    // Initialize axios instance
    this.axiosInstance = axios.create({
      baseURL: 'https://api.gumroad.com/v2/',
      headers: apiKey ? {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      }
    });
  }
  
  /**
   * Test API connection to Gumroad
   */
  protected async testApiConnection(): Promise<boolean> {
    try {
      // In real implementation, use an actual Gumroad API endpoint
      // For now, just simulate a successful connection
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Required implementation of the abstract method from BaseOpportunitySource
   */
  public async getOpportunities(
    skills: string[], 
    preferences: DiscoveryPreferences
  ): Promise<RawOpportunity[]> {
    try {
      logger.info(`[${this.id}] Getting opportunities for skills: ${skills.join(', ')}`);
      
      // Create a minimal input for the fetchOpportunities method
      const input: UserDiscoveryInput = {
        userId: 0,
        skills: skills,
        timeAvailability: preferences.timeAvailability,
        riskAppetite: preferences.riskAppetite,
        incomeGoals: preferences.incomeGoals,
        workPreference: preferences.workPreference
      };
      
      // Call the existing implementation
      return await this.fetchOpportunities(input);
    } catch (error) {
      logger.error(`Error in getOpportunities for ${this.id}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Fetch digital product opportunities from Gumroad
   * Note: This is a simplified implementation. In production, this would
   * connect to the actual Gumroad API and/or scrape data from the platform.
   */
  async fetchOpportunities(input: UserDiscoveryInput): Promise<RawOpportunity[]> {
    try {
      logger.info(`Fetching digital product opportunities from Gumroad for skills: ${input.skills.join(', ')}`);
      
      // In a real implementation, we would:
      // 1. Use Gumroad's API or scrape the platform for successful products
      // 2. Analyze top-selling products in categories related to user skills
      // 3. Extract key information about successful product types
      
      // Since Gumroad doesn't have a public API for discovery, in production
      // this would likely use web scraping of public product pages
      
      // For now, return simulated data based on common digital product categories
      return this.getDigitalProductOpportunities(input.skills);
    } catch (error) {
      this.handleError(error, 'fetchOpportunities');
      return [];
    }
  }
  
  /**
   * Generate digital product opportunities based on user skills
   */
  private getDigitalProductOpportunities(skills: string[]): RawOpportunity[] {
    const opportunities: RawOpportunity[] = [];
    
    // Map skills to potential digital product types
    for (const skill of skills) {
      const normalizedSkill = skill.toLowerCase().trim();
      
      // Design products
      if (
        normalizedSkill.includes('design') ||
        normalizedSkill.includes('graphic') ||
        normalizedSkill.includes('illustrat') ||
        normalizedSkill.includes('photo') ||
        normalizedSkill.includes('adobe')
      ) {
        opportunities.push(
          this.createOpportunity({
            title: 'Premium Design Template Bundle',
            description: 'Create and sell a bundle of professional design templates, such as social media graphics, presentation templates, or brand kits that businesses can purchase and customize.',
            skillsRequired: ['graphic design', 'digital asset creation', 'template design'],
            estimatedIncome: {
              min: 3000,
              max: 10000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 0,
              max: 200
            },
            timeCommitment: {
              min: 40,
              max: 100,
              timeframe: 'weekly'
            },
            entryBarrier: 'MEDIUM',
            competition: 'high'
          })
        );
        
        opportunities.push(
          this.createOpportunity({
            title: 'Digital Illustration Pack or Font',
            description: 'Create a set of unique digital illustrations or custom fonts that can be licensed for commercial use. Popular themes include seasonal graphics, character sets, or specialized icon collections.',
            skillsRequired: ['illustration', 'digital art', 'typography'],
            estimatedIncome: {
              min: 1000,
              max: 5000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 0,
              max: 100
            },
            timeCommitment: {
              min: 30,
              max: 80,
              timeframe: 'weekly'
            },
            entryBarrier: 'MEDIUM',
            competition: 'medium'
          })
        );
      }
      
      // Development/Coding products
      if (
        normalizedSkill.includes('develop') ||
        normalizedSkill.includes('code') ||
        normalizedSkill.includes('program') ||
        normalizedSkill.includes('javascript') ||
        normalizedSkill.includes('python') ||
        normalizedSkill.includes('web')
      ) {
        opportunities.push(
          this.createOpportunity({
            title: 'Premium Code Snippet Library or Plugin',
            description: 'Develop and sell a library of code snippets, components, or plugins that solve specific problems for developers. Popular options include UI component libraries, WordPress plugins, or specialized function collections.',
            skillsRequired: ['software development', 'plugin development', 'documentation'],
            estimatedIncome: {
              min: 2000,
              max: 8000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 0,
              max: 100
            },
            timeCommitment: {
              min: 60,
              max: 120,
              timeframe: 'weekly'
            },
            entryBarrier: 'HIGH',
            competition: 'medium'
          })
        );
        
        opportunities.push(
          this.createOpportunity({
            title: 'Website Theme or Template',
            description: 'Create and sell premium website themes or templates for popular platforms like WordPress, Shopify, or Webflow. Focus on specific niches like portfolio sites for creatives, e-commerce for small businesses, or specialized industry solutions.',
            skillsRequired: ['web development', 'web design', 'theme development'],
            estimatedIncome: {
              min: 1500,
              max: 7000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 0,
              max: 200
            },
            timeCommitment: {
              min: 40,
              max: 100,
              timeframe: 'weekly'
            },
            entryBarrier: 'MEDIUM',
            competition: 'high'
          })
        );
      }
      
      // Writing/Content products
      if (
        normalizedSkill.includes('writ') ||
        normalizedSkill.includes('content') ||
        normalizedSkill.includes('edit') ||
        normalizedSkill.includes('blog') ||
        normalizedSkill.includes('journal') ||
        normalizedSkill.includes('copywr')
      ) {
        opportunities.push(
          this.createOpportunity({
            title: 'Digital Guide or Ebook',
            description: 'Write and self-publish a specialized guide or ebook on a topic where you have expertise. Focus on solving specific problems or teaching valuable skills that people are willing to pay for.',
            skillsRequired: ['writing', 'content creation', 'research', 'editing'],
            estimatedIncome: {
              min: 500,
              max: 3000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 0,
              max: 300
            },
            timeCommitment: {
              min: 40,
              max: 100,
              timeframe: 'weekly'
            },
            entryBarrier: 'LOW',
            competition: 'high'
          })
        );
        
        opportunities.push(
          this.createOpportunity({
            title: 'Template Bundle for Writers and Content Creators',
            description: 'Create and sell a bundle of templates for writers, such as pitch templates, content calendars, outlines for different types of articles, or SEO-optimized blog post structures.',
            skillsRequired: ['content strategy', 'writing', 'template design'],
            estimatedIncome: {
              min: 800,
              max: 2500,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 0,
              max: 100
            },
            timeCommitment: {
              min: 30,
              max: 80,
              timeframe: 'weekly'
            },
            entryBarrier: 'LOW',
            competition: 'medium'
          })
        );
      }
      
      // Photography/Video products
      if (
        normalizedSkill.includes('photo') ||
        normalizedSkill.includes('video') ||
        normalizedSkill.includes('film') ||
        normalizedSkill.includes('edit') ||
        normalizedSkill.includes('camera')
      ) {
        opportunities.push(
          this.createOpportunity({
            title: 'Premium Photo or Video Preset Pack',
            description: 'Create and sell professional presets for photo or video editing software like Lightroom, Photoshop, or Premiere Pro. Target specific niches like wedding photography, travel content, or food photography.',
            skillsRequired: ['photography', 'photo editing', 'preset creation'],
            estimatedIncome: {
              min: 1000,
              max: 5000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 0,
              max: 100
            },
            timeCommitment: {
              min: 30,
              max: 60,
              timeframe: 'weekly'
            },
            entryBarrier: 'MEDIUM',
            competition: 'high'
          })
        );
        
        opportunities.push(
          this.createOpportunity({
            title: 'Stock Photo or Video Collection',
            description: 'Create and sell a specialized collection of stock photos or videos focused on an underserved niche. Consider trends, seasonal themes, or industry-specific visuals that are in demand but hard to find.',
            skillsRequired: ['photography', 'videography', 'editing', 'keywording'],
            estimatedIncome: {
              min: 700,
              max: 4000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 100,
              max: 500
            },
            timeCommitment: {
              min: 40,
              max: 80,
              timeframe: 'weekly'
            },
            entryBarrier: 'MEDIUM',
            competition: 'medium'
          })
        );
      }
      
      // Music/Audio products
      if (
        normalizedSkill.includes('music') ||
        normalizedSkill.includes('audio') ||
        normalizedSkill.includes('sound') ||
        normalizedSkill.includes('record') ||
        normalizedSkill.includes('mix') ||
        normalizedSkill.includes('produc')
      ) {
        opportunities.push(
          this.createOpportunity({
            title: 'Sound Effect or Sample Pack',
            description: 'Create and sell a library of sound effects or samples for audio producers, filmmakers, game developers, or podcasters. Focus on high-quality, unique sounds that fill a specific need.',
            skillsRequired: ['audio production', 'sound design', 'recording', 'editing'],
            estimatedIncome: {
              min: 800,
              max: 4000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 100,
              max: 500
            },
            timeCommitment: {
              min: 40,
              max: 80,
              timeframe: 'weekly'
            },
            entryBarrier: 'MEDIUM',
            competition: 'medium'
          })
        );
        
        opportunities.push(
          this.createOpportunity({
            title: 'Music Production Templates or Project Files',
            description: 'Sell DAW project files, templates, or virtual instrument presets that help other producers create professional-sounding music more efficiently. Target specific genres or production styles.',
            skillsRequired: ['music production', 'digital audio workstation', 'sound design'],
            estimatedIncome: {
              min: 1000,
              max: 5000,
              timeframe: 'monthly'
            },
            startupCost: {
              min: 0,
              max: 300
            },
            timeCommitment: {
              min: 40,
              max: 100,
              timeframe: 'weekly'
            },
            entryBarrier: 'MEDIUM',
            competition: 'medium'
          })
        );
      }
    }
    
    // If no specific matches, provide some general options
    if (opportunities.length === 0) {
      opportunities.push(
        this.createOpportunity({
          title: 'Digital Planner or Organizational Tool',
          description: 'Create a digital planner, tracker, or organizational tool that helps people manage their time, projects, habits, or finances. These products have wide appeal and can be customized for different niches.',
          skillsRequired: ['digital design', 'organization', 'planning systems'],
          estimatedIncome: {
            min: 500,
            max: 3000,
            timeframe: 'monthly'
          },
          startupCost: {
            min: 0,
            max: 100
          },
          timeCommitment: {
            min: 30,
            max: 60,
            timeframe: 'weekly'
          },
          entryBarrier: 'LOW',
          competition: 'high'
        })
      );
      
      opportunities.push(
        this.createOpportunity({
          title: 'Niche Knowledge Product',
          description: 'Package your specialized knowledge into a digital product that helps others solve a specific problem or achieve a particular goal. This could be a guide, tutorial series, or reference material in your area of expertise.',
          skillsRequired: ['knowledge in field', 'content creation', 'digital product design'],
          estimatedIncome: {
            min: 300,
            max: 2000,
            timeframe: 'monthly'
          },
          startupCost: {
            min: 0,
            max: 100
          },
          timeCommitment: {
            min: 20,
            max: 60,
            timeframe: 'weekly'
          },
          entryBarrier: 'LOW',
          competition: 'medium'
        })
      );
    }
    
    return opportunities;
  }
  
  /**
   * Create a standardized opportunity object from input data
   */
  private createOpportunity(data: {
    title: string;
    description: string;
    skillsRequired: string[];
    estimatedIncome: { min: number; max: number; timeframe: string };
    startupCost: { min: number; max: number };
    timeCommitment: { min: number; max: number; timeframe: string };
    entryBarrier: string;
    competition: 'low' | 'medium' | 'high';
  }): RawOpportunity {
    // Generate unique ID based on the title
    const id = this.generateOpportunityId('gumroad', data.title + '-' + Date.now());
    
    // Convert time commitment to hours per week
    const timeRequired = {
      min: data.timeCommitment.min,
      max: data.timeCommitment.max,
      // Normalize to weekly if needed
      ...(data.timeCommitment.timeframe !== 'weekly' && {
        min: this.normalizeToWeekly(data.timeCommitment.min, data.timeCommitment.timeframe),
        max: this.normalizeToWeekly(data.timeCommitment.max, data.timeCommitment.timeframe)
      })
    };
    
    // Calculate time to first revenue (in days)
    const timeToFirstRevenue = Math.floor(Math.random() * 60) + 30; // 30-90 days
    
    // Determine risk level
    const riskLevel = this.categorizeRiskLevel(
      data.startupCost.max,
      timeToFirstRevenue,
      data.competition
    );
    
    // Create the opportunity object
    return {
      id,
      source: this.id,
      title: data.title,
      description: data.description,
      requiredSkills: data.skillsRequired,
      niceToHaveSkills: [],
      type: 'DIGITAL_PRODUCT', // Gumroad is primarily for digital products
      estimatedIncome: {
        min: data.estimatedIncome.min,
        max: data.estimatedIncome.max,
        timeframe: data.estimatedIncome.timeframe
      },
      startupCost: {
        min: data.startupCost.min,
        max: data.startupCost.max
      },
      timeRequired,
      entryBarrier: data.entryBarrier,
      marketDemand: data.competition === 'high' ? 'HIGH' : (data.competition === 'medium' ? 'MEDIUM' : 'LOW'),
      stepsToStart: [
        'Create a Gumroad account',
        'Develop your digital product',
        'Design an attractive product page',
        'Set pricing and publish your product',
        'Market your product through social media and email'
      ],
      successStories: [
        {
          name: 'Alex Morgan',
          background: 'Graphic designer with side projects',
          journey: 'Created premium design templates for social media',
          outcome: `Now earning $${Math.floor(data.estimatedIncome.min * 1.5)}-${Math.floor(data.estimatedIncome.max * 0.8)} ${data.estimatedIncome.timeframe}`
        }
      ],
      resources: [
        { title: "Gumroad Creator Guide", url: "https://help.gumroad.com/article/2-gumroad-creator-guide" },
        { title: "Digital Product Success Blueprint", url: "https://www.digitalproductblueprint.com" }
      ],
      skillGapDays: 0,
      matchScore: Math.random() * 0.3 + 0.6, // 0.6-0.9
      timeToFirstRevenue: `${timeToFirstRevenue} days`,
      roiScore: Math.floor(Math.random() * 20) + 70 // 70-90
    };
  }
  
  /**
   * Normalize time commitment to weekly hours
   */
  private normalizeToWeekly(value: number, timeframe: string): number {
    switch (timeframe.toLowerCase()) {
      case 'daily':
        return value * 7;
      case 'monthly':
        return value / 4;
      default:
        return value;
    }
  }
  
  /**
   * Handle errors from the Gumroad API
   */
  private handleError(error: any, method: string): void {
    logger.error(`${this.id}.${method} error: ${error instanceof Error ? error.message : String(error)}`);
  }
}