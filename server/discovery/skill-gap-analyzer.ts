/**
 * Skill Gap Analyzer
 * 
 * This module analyzes skill gaps between users and opportunities,
 * providing learning recommendations to bridge those gaps.
 */

import { RawOpportunity, Resource } from './types';
import { logger } from './utils';

// Interface for skill gap analysis result
export interface SkillGapAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  relevantSkills: string[];
  learningResources: Resource[];
  estimatedTimeToLearn: string;  // e.g., "2 weeks", "1 month"
  learningDifficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Learning resource platform categories
type ResourcePlatform = 'udemy' | 'coursera' | 'youtube' | 'freecodecamp' | 'docs' | 'github' | 'books' | 'blogs' | 'other';

// Learning resource database with typical learning resources for common skills
const learningResourceDatabase: Record<string, Resource[]> = {
  // Programming skills
  'javascript': [
    {
      title: 'JavaScript - The Complete Guide 2023',
      url: 'https://www.udemy.com/course/javascript-the-complete-guide-2020-beginner-advanced/',
      type: 'course',
      isPaid: true,
      duration: '52 hours',
      source: 'Udemy',
      description: 'Modern JavaScript from the beginning - all the way up to JS expert level!'
    },
    {
      title: 'JavaScript.info',
      url: 'https://javascript.info/',
      type: 'article',
      isPaid: false,
      duration: 'Self-paced',
      source: 'JavaScript.info',
      description: 'The Modern JavaScript Tutorial'
    }
  ],
  'react': [
    {
      title: 'React - The Complete Guide',
      url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
      type: 'course',
      isPaid: true,
      duration: '48 hours',
      source: 'Udemy',
      description: 'Dive in and learn React.js from scratch!'
    },
    {
      title: 'React Documentation',
      url: 'https://reactjs.org/docs/getting-started.html',
      type: 'article',
      isPaid: false,
      duration: 'Self-paced',
      source: 'React.org',
      description: 'Official React.js documentation'
    }
  ],
  'python': [
    {
      title: 'Complete Python Bootcamp From Zero to Hero',
      url: 'https://www.udemy.com/course/complete-python-bootcamp/',
      type: 'course',
      isPaid: true,
      duration: '24 hours',
      source: 'Udemy',
      description: 'Learn Python like a Professional!'
    },
    {
      title: 'Python for Everybody Specialization',
      url: 'https://www.coursera.org/specializations/python',
      type: 'course',
      isPaid: true,
      duration: '8 months',
      source: 'Coursera',
      description: 'Learn to Program and Analyze Data with Python'
    }
  ],
  
  // Design skills
  'ui design': [
    {
      title: 'UI Design Fundamentals',
      url: 'https://www.youtube.com/watch?v=tRpoI6vkqLs',
      type: 'video',
      isPaid: false,
      duration: '2 hours',
      source: 'YouTube',
      description: 'Learn UI Design fundamentals'
    },
    {
      title: 'The UI Design Bootcamp',
      url: 'https://scrimba.com/learn/designbootcamp',
      type: 'course',
      isPaid: true,
      duration: '9 hours',
      source: 'Scrimba',
      description: 'Learn UI Design with hands-on projects'
    }
  ],
  'ux design': [
    {
      title: 'Google UX Design Professional Certificate',
      url: 'https://www.coursera.org/professional-certificates/google-ux-design',
      type: 'course',
      isPaid: true,
      duration: '6 months',
      source: 'Coursera',
      description: 'Launch your career in UX design with Google'
    }
  ],
  
  // Marketing skills
  'content marketing': [
    {
      title: 'Content Marketing Masterclass',
      url: 'https://www.udemy.com/course/content-marketing-masterclass/',
      type: 'course',
      isPaid: true,
      duration: '12 hours',
      source: 'Udemy',
      description: 'Grow your business with content marketing'
    }
  ],
  'seo': [
    {
      title: 'SEO 2023: Complete SEO Training',
      url: 'https://www.udemy.com/course/seo-training-2021/',
      type: 'course',
      isPaid: true,
      duration: '16 hours',
      source: 'Udemy',
      description: 'Rank #1 on Google and drive massive traffic'
    },
    {
      title: 'SEO Starter Guide',
      url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      type: 'article',
      isPaid: false,
      duration: 'Self-paced',
      source: 'Google',
      description: 'Google\'s official SEO starter guide'
    }
  ],
  
  // Business skills
  'entrepreneurship': [
    {
      title: 'How to Build a Startup',
      url: 'https://www.udacity.com/course/how-to-build-a-startup--ep245',
      type: 'course',
      isPaid: false,
      duration: '1 month',
      source: 'Udacity',
      description: 'The Lean LaunchPad approach to building startups'
    }
  ],
  'sales': [
    {
      title: 'Sales Training: B2B Consultative Selling',
      url: 'https://www.udemy.com/course/consultative-selling/',
      type: 'course',
      isPaid: true,
      duration: '7 hours',
      source: 'Udemy',
      description: 'Learn how to sell high-ticket products and services'
    }
  ],
  
  // Writing skills
  'copywriting': [
    {
      title: 'The Complete Copywriting Course',
      url: 'https://www.udemy.com/course/the-complete-copywriting-course/',
      type: 'course',
      isPaid: true,
      duration: '7 hours',
      source: 'Udemy',
      description: 'Learn to write effective copy that sells'
    }
  ],
  'content creation': [
    {
      title: 'Content Creation: Viral Marketing Master Guide',
      url: 'https://www.udemy.com/course/content-creation-viral-marketing-master-guide/',
      type: 'course',
      isPaid: true,
      duration: '11 hours',
      source: 'Udemy',
      description: 'Learn to create viral content that drives engagement'
    }
  ],
  
  // Teaching/coaching skills
  'teaching': [
    {
      title: 'How to Create and Teach Online Courses',
      url: 'https://www.udemy.com/course/how-to-teach-online/',
      type: 'course',
      isPaid: true,
      duration: '4 hours',
      source: 'Udemy',
      description: 'Learn to create and teach online courses'
    }
  ],
  'coaching': [
    {
      title: 'Life Coaching Certificate Course',
      url: 'https://www.udemy.com/course/life-coaching-online-certification/',
      type: 'course',
      isPaid: true,
      duration: '31 hours',
      source: 'Udemy',
      description: 'Become a certified life coach'
    }
  ],
  
  // Generic skills
  'communication': [
    {
      title: 'Effective Communication Skills',
      url: 'https://www.linkedin.com/learning/effective-communication-skills-with-deborah-grayson-riegel',
      type: 'course',
      isPaid: true,
      duration: '3 hours',
      source: 'LinkedIn Learning',
      description: 'Learn effective communication techniques'
    }
  ],
  'time management': [
    {
      title: 'Productivity and Time Management for the Overwhelmed',
      url: 'https://www.udemy.com/course/productivity-time-management-for-the-overwhelmed/',
      type: 'course',
      isPaid: true,
      duration: '6 hours',
      source: 'Udemy',
      description: 'Master time management and productivity'
    }
  ]
};

export class SkillGapAnalyzer {
  /**
   * Analyze skill gaps between user skills and opportunity requirements
   */
  public analyzeSkillGap(
    userSkills: string[],
    opportunity: RawOpportunity
  ): SkillGapAnalysis {
    try {
      logger.info(`Analyzing skill gap for opportunity: ${opportunity.id}`);
      
      const requiredSkills = opportunity.requiredSkills || [];
      const niceToHaveSkills = opportunity.niceToHaveSkills || [];
      
      // Normalize all skills to lowercase for better matching
      const normalizedUserSkills = userSkills.map(s => s.toLowerCase());
      const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase());
      const normalizedNiceToHaveSkills = niceToHaveSkills.map(s => s.toLowerCase());
      
      // Find matched and missing skills
      const matchedSkills = normalizedRequiredSkills.filter(skill => 
        normalizedUserSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
      );
      
      const missingSkills = normalizedRequiredSkills.filter(skill => 
        !normalizedUserSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
      );
      
      // Find relevant skills (nice-to-have that user has)
      const relevantSkills = normalizedNiceToHaveSkills.filter(skill => 
        normalizedUserSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
      );
      
      // Find learning resources for missing skills
      const learningResources = this.findLearningResources(missingSkills);
      
      // Estimate time to learn missing skills
      const estimatedTimeToLearn = this.estimateTimeToLearn(missingSkills);
      
      // Determine learning difficulty
      const learningDifficulty = this.determineLearningDifficulty(missingSkills);
      
      return {
        matchedSkills: matchedSkills,
        missingSkills: missingSkills,
        relevantSkills: relevantSkills,
        learningResources: learningResources,
        estimatedTimeToLearn: estimatedTimeToLearn,
        learningDifficulty: learningDifficulty
      };
    } catch (error) {
      logger.error(`Error in skill gap analysis: ${error instanceof Error ? error.message : String(error)}`);
      // Return default analysis with error information
      return {
        matchedSkills: [],
        missingSkills: [],
        relevantSkills: [],
        learningResources: [{
          title: 'Error in skill gap analysis',
          url: '#',
          type: 'other',
          isPaid: false,
          description: 'Could not analyze skill gap. Please try again later.'
        }],
        estimatedTimeToLearn: 'unknown',
        learningDifficulty: 'intermediate'
      };
    }
  }
  
  /**
   * Find learning resources for missing skills
   */
  private findLearningResources(missingSkills: string[]): Resource[] {
    const resources: Resource[] = [];
    
    // Limit to top 3 missing skills for focused learning
    const topMissingSkills = missingSkills.slice(0, 3);
    
    for (const skill of topMissingSkills) {
      // Find exact or similar skill in database
      const exactMatch = learningResourceDatabase[skill];
      
      if (exactMatch) {
        resources.push(...exactMatch.slice(0, 2)); // Add top 2 resources per skill
      } else {
        // Try to find similar skills
        const similarSkill = Object.keys(learningResourceDatabase).find(dbSkill => 
          dbSkill.includes(skill) || skill.includes(dbSkill)
        );
        
        if (similarSkill) {
          const similarResources = learningResourceDatabase[similarSkill];
          resources.push(...similarResources.slice(0, 1)); // Add 1 resource for similar skill
        } else {
          // Add generic resource if no specific resource found
          resources.push(this.getGenericResource(skill));
        }
      }
    }
    
    // Limit to maximum 5 resources total
    return resources.slice(0, 5);
  }
  
  /**
   * Get generic learning resource for a skill
   */
  private getGenericResource(skill: string): Resource {
    return {
      title: `Learn ${skill} - Online Resources`,
      url: `https://www.google.com/search?q=learn+${encodeURIComponent(skill)}+course`,
      type: 'other',
      isPaid: false,
      duration: 'Varies',
      source: 'Various',
      description: `Find the best resources to learn ${skill}`
    };
  }
  
  /**
   * Estimate time to learn missing skills
   */
  private estimateTimeToLearn(missingSkills: string[]): string {
    if (missingSkills.length === 0) return "0 days";
    if (missingSkills.length === 1) return "2 weeks";
    if (missingSkills.length === 2) return "1 month";
    if (missingSkills.length === 3) return "2 months";
    if (missingSkills.length <= 5) return "3-4 months";
    return "6+ months";
  }
  
  /**
   * Determine learning difficulty based on skills
   */
  private determineLearningDifficulty(missingSkills: string[]): 'beginner' | 'intermediate' | 'advanced' {
    // Define difficulty levels for common skills
    const advancedSkills = [
      'machine learning', 'data science', 'ai', 'deep learning', 
      'blockchain', 'algorithm', 'architecture', 'system design'
    ];
    
    const intermediateSkills = [
      'javascript', 'python', 'react', 'node', 'sql', 'database',
      'ui design', 'ux design', 'marketing', 'copywriting', 'analytics'
    ];
    
    // Check if any missing skills are advanced
    const hasAdvancedSkills = missingSkills.some(skill => 
      advancedSkills.some(advSkill => skill.includes(advSkill))
    );
    
    if (hasAdvancedSkills) return 'advanced';
    
    // Check if any missing skills are intermediate
    const hasIntermediateSkills = missingSkills.some(skill => 
      intermediateSkills.some(intSkill => skill.includes(intSkill))
    );
    
    if (hasIntermediateSkills) return 'intermediate';
    
    // Default to beginner for all other skills
    return 'beginner';
  }
}