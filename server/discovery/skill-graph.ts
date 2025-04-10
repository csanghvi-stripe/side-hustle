/**
 * Skill Graph and Learning Time Estimator
 * 
 * This module provides data-driven skill relationship mapping and learning time
 * estimation, replacing hard-coded values with a dynamic model that evolves
 * based on user outcomes.
 */

import { logger } from './utils';
import { configManager } from './config-manager';

interface SkillNode {
  id: string;
  name: string;
  category: string;
  relatedSkills: string[];
  prerequisites: string[];
  complexity: number; // 1-10 scale
  learningResources: {
    title: string;
    url: string;
    estimatedHours: number;
  }[];
  averageLearningDays?: number;
  learningDataPoints?: number;
}

interface LearningTime {
  min: number;
  max: number;
  average: number;
  confidence: number; // 0-1 scale
}

export class SkillGraph {
  private skills: Map<string, SkillNode> = new Map();
  private userLearningData: Map<string, number[]> = new Map(); // skill ID to array of learning days
  private defaultComplexityToDays = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120]; // Mapping complexity to days

  constructor() {
    this.initializeBaseSkills();
    logger.info(`Initialized skill graph with ${this.skills.size} base skills`);
  }

  /**
   * Initialize with base common skills
   */
  private initializeBaseSkills(): void {
    // Web development skills
    this.addSkill({
      id: 'html',
      name: 'HTML',
      category: 'web_development',
      relatedSkills: ['css', 'javascript'],
      prerequisites: [],
      complexity: 2,
      learningResources: [
        { title: 'MDN HTML Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', estimatedHours: 15 }
      ]
    });

    this.addSkill({
      id: 'css',
      name: 'CSS',
      category: 'web_development',
      relatedSkills: ['html', 'sass'],
      prerequisites: ['html'],
      complexity: 4,
      learningResources: [
        { title: 'MDN CSS Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS', estimatedHours: 25 }
      ]
    });

    this.addSkill({
      id: 'javascript',
      name: 'JavaScript',
      category: 'web_development',
      relatedSkills: ['html', 'css', 'react', 'node'],
      prerequisites: ['html', 'css'],
      complexity: 6,
      learningResources: [
        { title: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', estimatedHours: 50 }
      ]
    });

    // Content creation skills
    this.addSkill({
      id: 'content_writing',
      name: 'Content Writing',
      category: 'writing',
      relatedSkills: ['copywriting', 'seo'],
      prerequisites: [],
      complexity: 3,
      learningResources: [
        { title: 'HubSpot Content Marketing Course', url: 'https://academy.hubspot.com/courses/content-marketing', estimatedHours: 20 }
      ]
    });

    this.addSkill({
      id: 'copywriting',
      name: 'Copywriting',
      category: 'writing',
      relatedSkills: ['content_writing', 'marketing'],
      prerequisites: [],
      complexity: 4,
      learningResources: [
        { title: 'Copyblogger', url: 'https://www.copyblogger.com/', estimatedHours: 30 }
      ]
    });

    // Design skills
    this.addSkill({
      id: 'graphic_design',
      name: 'Graphic Design',
      category: 'design',
      relatedSkills: ['ui_design', 'illustration'],
      prerequisites: [],
      complexity: 7,
      learningResources: [
        { title: 'Canva Design School', url: 'https://www.canva.com/learn/', estimatedHours: 40 }
      ]
    });

    // Add teaching skills
    this.addSkill({
      id: 'teaching',
      name: 'Teaching',
      category: 'education',
      relatedSkills: ['curriculum_design', 'public_speaking'],
      prerequisites: [],
      complexity: 5,
      learningResources: [
        { title: 'Coursera Teaching Online', url: 'https://www.coursera.org/learn/teach-online', estimatedHours: 30 }
      ]
    });

    this.addSkill({
      id: 'curriculum_design',
      name: 'Curriculum Design',
      category: 'education',
      relatedSkills: ['teaching', 'instructional_design'],
      prerequisites: ['teaching'],
      complexity: 6,
      learningResources: [
        { title: 'EdX Instructional Design Course', url: 'https://www.edx.org/course/instructional-design-digital-media-new-tools-and', estimatedHours: 35 }
      ]
    });

    // Add fitness skills
    this.addSkill({
      id: 'fitness',
      name: 'Fitness',
      category: 'health',
      relatedSkills: ['nutrition', 'personal_training'],
      prerequisites: [],
      complexity: 4,
      learningResources: [
        { title: 'ACE Fitness Certification', url: 'https://www.acefitness.org/fitness-certifications/', estimatedHours: 60 }
      ]
    });

    this.addSkill({
      id: 'personal_training',
      name: 'Personal Training',
      category: 'health',
      relatedSkills: ['fitness', 'nutrition'],
      prerequisites: ['fitness'],
      complexity: 6,
      learningResources: [
        { title: 'NASM Personal Trainer', url: 'https://www.nasm.org/become-a-personal-trainer', estimatedHours: 80 }
      ]
    });

    // Add cooking skills
    this.addSkill({
      id: 'cooking',
      name: 'Cooking',
      category: 'culinary',
      relatedSkills: ['food_photography', 'recipe_development'],
      prerequisites: [],
      complexity: 4,
      learningResources: [
        { title: 'MasterClass Cooking Techniques', url: 'https://www.masterclass.com/categories/culinary-arts', estimatedHours: 40 }
      ]
    });

    this.addSkill({
      id: 'recipe_development',
      name: 'Recipe Development',
      category: 'culinary',
      relatedSkills: ['cooking', 'food_writing'],
      prerequisites: ['cooking'],
      complexity: 5,
      learningResources: [
        { title: 'Food Blogger Pro', url: 'https://www.foodbloggerpro.com/', estimatedHours: 30 }
      ]
    });

    // Add acting skills
    this.addSkill({
      id: 'acting',
      name: 'Acting',
      category: 'performing_arts',
      relatedSkills: ['public_speaking', 'voice_acting'],
      prerequisites: [],
      complexity: 7,
      learningResources: [
        { title: 'MasterClass Acting', url: 'https://www.masterclass.com/categories/film-tv', estimatedHours: 50 }
      ]
    });

    this.addSkill({
      id: 'voice_acting',
      name: 'Voice Acting',
      category: 'performing_arts',
      relatedSkills: ['acting', 'audio_editing'],
      prerequisites: [],
      complexity: 5,
      learningResources: [
        { title: 'Gravy For The Brain', url: 'https://gravyforthebrain.com/', estimatedHours: 40 }
      ]
    });

    // Add dancing skills
    this.addSkill({
      id: 'dancing',
      name: 'Dancing',
      category: 'performing_arts',
      relatedSkills: ['choreography', 'fitness'],
      prerequisites: [],
      complexity: 6,
      learningResources: [
        { title: 'Steezy Dance Classes', url: 'https://www.steezy.co/', estimatedHours: 45 }
      ]
    });

    // Add more skills for other domains as needed
  }

  /**
   * Add a skill to the graph
   */
  public addSkill(skill: SkillNode): void {
    this.skills.set(skill.id, skill);
  }

  /**
   * Get skill by ID
   */
  public getSkill(skillId: string): SkillNode | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Find matching skills in the graph from a text description
   */
  public findSkillMatches(skillText: string): string[] {
    const normalized = skillText.toLowerCase();
    const matches: string[] = [];

    // Direct match first
    for (const [id, skill] of this.skills.entries()) {
      if (normalized.includes(skill.name.toLowerCase())) {
        matches.push(id);
      }
    }

    // If no direct matches, look for partial matches
    if (matches.length === 0) {
      for (const [id, skill] of this.skills.entries()) {
        // Check if any words in the skill name match
        const skillWords = skill.name.toLowerCase().split(/\\s+/);
        for (const word of skillWords) {
          if (word.length > 3 && normalized.includes(word)) {
            matches.push(id);
            break;
          }
        }
      }
    }

    return matches;
  }

  /**
   * Calculate learning time for a skill
   */
  public calculateLearningTime(skillId: string, userPriorSkills: string[] = []): LearningTime {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return this.getDefaultLearningTime(5); // Medium complexity as fallback
    }

    // Check if user already has prerequisites
    const prerequisiteTime = this.calculatePrerequisiteTime(skill, userPriorSkills);

    // Base learning time from complexity
    const baseLearningDays = this.defaultComplexityToDays[skill.complexity - 1] || 30;

    // Adjust based on collected data
    let adjustedTime = baseLearningDays;
    let confidence = 0.5; // Default confidence

    if (skill.averageLearningDays && skill.learningDataPoints) {
      // The more data points we have, the more we trust the average
      const dataWeight = Math.min(0.8, skill.learningDataPoints / 100);
      adjustedTime = (baseLearningDays * (1 - dataWeight)) + (skill.averageLearningDays * dataWeight);
      confidence = Math.min(0.9, 0.5 + (skill.learningDataPoints / 200));
    }

    // Total time is prerequisite time + skill learning time
    const totalMinDays = prerequisiteTime.min + Math.max(1, adjustedTime * 0.7);
    const totalMaxDays = prerequisiteTime.max + adjustedTime * 1.3;
    const totalAvgDays = prerequisiteTime.average + adjustedTime;

    return {
      min: Math.round(totalMinDays),
      max: Math.round(totalMaxDays),
      average: Math.round(totalAvgDays),
      confidence
    };
  }

  /**
   * Calculate time needed to learn prerequisites
   */
  private calculatePrerequisiteTime(skill: SkillNode, userPriorSkills: string[]): LearningTime {
    let totalMinDays = 0;
    let totalMaxDays = 0;
    let totalAvgDays = 0;

    // Check each prerequisite
    for (const prereqId of skill.prerequisites) {
      // Skip if user already has this skill
      if (userPriorSkills.includes(prereqId)) {
        continue;
      }

      const prereqTime = this.calculateLearningTime(prereqId, userPriorSkills);
      totalMinDays += prereqTime.min;
      totalMaxDays += prereqTime.max;
      totalAvgDays += prereqTime.average;
    }

    return {
      min: totalMinDays,
      max: totalMaxDays,
      average: totalAvgDays,
      confidence: 0.7 // Slightly less confident about prerequisite timing
    };
  }

  /**
   * Get default learning time for a complexity level
   */
  private getDefaultLearningTime(complexity: number): LearningTime {
    const baseDays = this.defaultComplexityToDays[complexity - 1] || 30;
    return {
      min: Math.max(1, Math.round(baseDays * 0.7)),
      max: Math.round(baseDays * 1.3),
      average: baseDays,
      confidence: 0.4 // Low confidence for default estimates
    };
  }

  /**
   * Record actual learning time from user feedback
   */
  public recordLearningTime(skillId: string, days: number): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    // Add to the learning data
    if (!this.userLearningData.has(skillId)) {
      this.userLearningData.set(skillId, []);
    }
    this.userLearningData.get(skillId)?.push(days);

    // Update the skill's average learning time
    const dataPoints = this.userLearningData.get(skillId) || [];
    const sum = dataPoints.reduce((a, b) => a + b, 0);
    skill.averageLearningDays = sum / dataPoints.length;
    skill.learningDataPoints = dataPoints.length;

    logger.info(`Updated learning time for ${skillId}: ${skill.averageLearningDays?.toFixed(1)} days (${dataPoints.length} data points)`);
  }

  /**
   * Calculate total skill gap in days for a user
   */
  public calculateSkillGapDays(
    requiredSkills: string[],
    niceToHaveSkills: string[],
    userSkills: string[]
  ): { days: number, breakdownBySkill: Record<string, number> } {
    // Normalize skills for better matching
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase());
    const normalizedNiceToHave = niceToHaveSkills.map(s => s.toLowerCase());
    const normalizedUser = userSkills.map(s => s.toLowerCase());

    // Map text skills to skills in our graph
    const requiredSkillIds: string[] = [];
    for (const skill of normalizedRequired) {
      const matches = this.findSkillMatches(skill);
      requiredSkillIds.push(...matches);
    }

    const niceToHaveSkillIds: string[] = [];
    for (const skill of normalizedNiceToHave) {
      const matches = this.findSkillMatches(skill);
      niceToHaveSkillIds.push(...matches);
    }

    const userSkillIds: string[] = [];
    for (const skill of normalizedUser) {
      const matches = this.findSkillMatches(skill);
      userSkillIds.push(...matches);
    }

    // Calculate learning times for missing skills
    const breakdownBySkill: Record<string, number> = {};
    let totalDays = 0;

    // Required skills first (higher weight)
    for (const skillId of [...new Set(requiredSkillIds)]) {
      if (!userSkillIds.includes(skillId)) {
        const learningTime = this.calculateLearningTime(skillId, userSkillIds);
        const days = learningTime.average;
        breakdownBySkill[skillId] = days;
        totalDays += days;
      }
    }

    // Nice-to-have skills (lower weight)
    for (const skillId of [...new Set(niceToHaveSkillIds)]) {
      if (!userSkillIds.includes(skillId) && !requiredSkillIds.includes(skillId)) {
        const learningTime = this.calculateLearningTime(skillId, userSkillIds);
        const days = Math.round(learningTime.average * 0.7); // Less time for nice-to-have
        breakdownBySkill[skillId] = days;
        totalDays += days;
      }
    }

    // If we don't have any matched skills in our graph, fall back to the old approach
    if (Object.keys(breakdownBySkill).length === 0) {
      return this.fallbackSkillGapCalculation(requiredSkills, niceToHaveSkills, userSkills);
    }

    // Cap at 90 days
    return {
      days: Math.min(90, totalDays),
      breakdownBySkill
    };
  }

  /**
   * Fallback to simple skill gap calculation when skill graph matching fails
   */
  private fallbackSkillGapCalculation(
    requiredSkills: string[],
    niceToHaveSkills: string[],
    userSkills: string[]
  ): { days: number, breakdownBySkill: Record<string, number> } {
    // Default values if missing
    const required = requiredSkills || [];
    const niceToHave = niceToHaveSkills || [];
    const user = userSkills || [];
    
    // Normalize all skills to lowercase for comparison
    const normalizedRequired = required.map(s => s.toLowerCase());
    const normalizedNiceToHave = niceToHave.map(s => s.toLowerCase());
    const normalizedUser = user.map(s => s.toLowerCase());
    
    // Find missing required skills
    const missingRequired = normalizedRequired.filter(
      skill => !normalizedUser.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
    );
    
    // Find missing nice-to-have skills
    const missingNiceToHave = normalizedNiceToHave.filter(
      skill => !normalizedUser.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
    );
    
    // Get configuration values instead of hard-coded
    const requiredSkillDaysMin = configManager.get('skillGap.requiredSkillDaysMin') || 7;
    const requiredSkillDaysMax = configManager.get('skillGap.requiredSkillDaysMax') || 21;
    const niceToHaveSkillDaysMin = configManager.get('skillGap.niceToHaveSkillDaysMin') || 3;
    const niceToHaveSkillDaysMax = configManager.get('skillGap.niceToHaveSkillDaysMax') || 7;
    
    // Calculate skill gap days
    const requiredSkillDays = missingRequired.length * 
      Math.floor(Math.random() * (requiredSkillDaysMax - requiredSkillDaysMin + 1) + requiredSkillDaysMin);
    
    const niceToHaveSkillDays = missingNiceToHave.length * 
      Math.floor(Math.random() * (niceToHaveSkillDaysMax - niceToHaveSkillDaysMin + 1) + niceToHaveSkillDaysMin);
    
    // Create a simple breakdown
    const breakdownBySkill: Record<string, number> = {};
    missingRequired.forEach(skill => {
      breakdownBySkill[skill] = Math.floor(
        Math.random() * (requiredSkillDaysMax - requiredSkillDaysMin + 1) + requiredSkillDaysMin
      );
    });
    
    missingNiceToHave.forEach(skill => {
      breakdownBySkill[skill] = Math.floor(
        Math.random() * (niceToHaveSkillDaysMax - niceToHaveSkillDaysMin + 1) + niceToHaveSkillDaysMin
      );
    });
    
    // Cap at 90 days
    return {
      days: Math.min(90, requiredSkillDays + niceToHaveSkillDays),
      breakdownBySkill
    };
  }
}

export const skillGraph = new SkillGraph();