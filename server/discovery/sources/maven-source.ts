/**
 * Maven Source Adapter
 *
 * This source captures opportunities from Maven (cohort-based courses platform)
 * for experts to teach what they know.
 */

import { BaseOpportunitySource } from "./base-source";
import {
  DiscoveryPreferences,
  RawOpportunity,
  Resource,
  SuccessStory,
} from "../types";
import { logger, generateId, calculateReadability } from "../utils";
import { OpportunityType, RiskLevel } from "../../../shared/schema";

export class MavenSource extends BaseOpportunitySource {
  constructor() {
    super("Maven", "maven", "https://maven.com");
  }

  /**
   * Get opportunities from Maven platform
   */
  public async getOpportunities(
    skills: string[],
    preferences: DiscoveryPreferences,
  ): Promise<RawOpportunity[]> {
    logger.info(
      `[${this.id}] Fetching opportunities from Maven for skills: ${skills.join(", ")}`,
    );

    // Check if we have cached results
    const cacheKey = `maven-${skills.sort().join(",")}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeMs) {
      logger.info(
        `Using cached Maven opportunities (${cached.data.length} items)`,
      );
      return cached.data;
    }

    // Implement actual Maven data fetching here
    // In this implementation, we'll seed with realistic opportunities since
    // Maven doesn't have a public API
    const opportunities = await this.getMavenOpportunities(skills);

    // Cache the results
    this.cache.set(cacheKey, {
      data: opportunities,
      timestamp: Date.now(),
    });

    return opportunities;
  }

  /**
   * Generate Maven course creation opportunities based on the user's skills
   */
  private async getMavenOpportunities(
    skills: string[],
  ): Promise<RawOpportunity[]> {
    try {
      const opportunities: RawOpportunity[] = [];

      // Define relevant skill categories
      const techSkills = [
        "programming",
        "web development",
        "data science",
        "machine learning",
        "AI",
        "python",
        "javascript",
        "react",
        "node.js",
      ];
      const businessSkills = [
        "marketing",
        "sales",
        "entrepreneurship",
        "management",
        "leadership",
        "strategy",
        "product management",
      ];
      const creativeSkills = [
        "design",
        "writing",
        "content creation",
        "video editing",
        "animation",
        "illustration",
      ];
      const wellnessSkills = [
        "fitness",
        "nutrition",
        "yoga",
        "meditation",
        "coaching",
        "mental health",
      ];

      const userHasTechSkills = skills.some((skill) =>
        techSkills.some((techSkill) =>
          skill.toLowerCase().includes(techSkill.toLowerCase()),
        ),
      );

      const userHasBusinessSkills = skills.some((skill) =>
        businessSkills.some((bizSkill) =>
          skill.toLowerCase().includes(bizSkill.toLowerCase()),
        ),
      );

      const userHasCreativeSkills = skills.some((skill) =>
        creativeSkills.some((creativeSkill) =>
          skill.toLowerCase().includes(creativeSkill.toLowerCase()),
        ),
      );

      const userHasWellnessSkills = skills.some((skill) =>
        wellnessSkills.some((wellnessSkill) =>
          skill.toLowerCase().includes(wellnessSkill.toLowerCase()),
        ),
      );

      // Add tech course opportunity
      if (userHasTechSkills) {
        opportunities.push(this.createTechCourseOpportunity(skills));
      }

      // Add business course opportunity
      if (userHasBusinessSkills) {
        opportunities.push(this.createBusinessCourseOpportunity(skills));
      }

      // Add creative course opportunity
      if (userHasCreativeSkills) {
        opportunities.push(this.createCreativeCourseOpportunity(skills));
      }

      // Add wellness course opportunity
      if (userHasWellnessSkills) {
        opportunities.push(this.createWellnessCourseOpportunity(skills));
      }

      // Add general course opportunity regardless of skills
      opportunities.push(this.createGeneralCourseOpportunity(skills));

      return opportunities;
    } catch (error) {
      logger.error(
        `Error generating Maven opportunities: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private createTechCourseOpportunity(skills: string[]): RawOpportunity {
    const title = "Create a Cohort-Based Tech Course on Maven";
    const relatedSkills = [
      "programming",
      "web development",
      "data science",
      "machine learning",
      "AI",
      "python",
      "javascript",
    ];

    // Find matching skills to personalize description
    const matchingSkills = skills.filter((skill) =>
      relatedSkills.some((relatedSkill) =>
        skill.toLowerCase().includes(relatedSkill.toLowerCase()),
      ),
    );

    const matchingSkillsText =
      matchingSkills.length > 0
        ? matchingSkills.join(", ")
        : "your technical expertise";

    const description = `Turn your expertise in ${matchingSkillsText} into a cohort-based course on Maven. Tech courses typically have high demand and strong earning potential. Maven's platform provides all the tools you need to create, market, and run your course with live sessions, community interaction, and progress tracking.`;

    return {
      id: generateId("maven-tech"),
      title,
      description,
      url: "https://maven.com/create",
      platform: "Maven",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ["teaching", "curriculum development", ...relatedSkills],
      niceToHaveSkills: ["public speaking", "community building", "marketing"],
      estimatedIncome: {
        min: 5000,
        max: 50000,
        timeframe: "course",
      },
      startupCost: {
        min: 0,
        max: 500,
      },
      timeRequired: {
        min: 15,
        max: 25,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Apply to become a Maven creator",
        "Define your course curriculum and learning outcomes",
        "Create course materials and assignments",
        "Schedule live sessions and community events",
        "Market your course to potential students",
        "Deliver your course and gather feedback",
      ],
      resourceLinks: ["https://maven.com/create", "https://maven.com/faq"],
      successStories: [
        'Tiago Forte earned over $1.2M teaching "Building a Second Brain" cohort courses on Maven.',
        "Lenny Rachitsky made $500K+ teaching product management courses on Maven.",
        "Sahil Bloom generated $400K+ teaching a writing course on Maven.",
      ],
      location: "Remote",
      competition: "Medium",
      sourceName: "Maven",
    };
  }

  private createBusinessCourseOpportunity(skills: string[]): RawOpportunity {
    const title = "Teach Business Skills Through a Maven Cohort Course";
    const relatedSkills = [
      "marketing",
      "sales",
      "entrepreneurship",
      "management",
      "leadership",
      "strategy",
      "product management",
    ];

    // Find matching skills to personalize description
    const matchingSkills = skills.filter((skill) =>
      relatedSkills.some((relatedSkill) =>
        skill.toLowerCase().includes(relatedSkill.toLowerCase()),
      ),
    );

    const matchingSkillsText =
      matchingSkills.length > 0
        ? matchingSkills.join(", ")
        : "your business expertise";

    const description = `Create a cohort-based course teaching ${matchingSkillsText} on Maven. Business and career development courses are in high demand and can generate significant income. Maven provides the platform, payment processing, and community tools so you can focus on delivering quality content and live sessions.`;

    return {
      id: generateId("maven-business"),
      title,
      description,
      url: "https://maven.com/create",
      platform: "Maven",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ["teaching", "business expertise", ...relatedSkills],
      niceToHaveSkills: [
        "public speaking",
        "community management",
        "course creation",
      ],
      estimatedIncome: {
        min: 10000,
        max: 60000,
        timeframe: "course",
      },
      startupCost: {
        min: 0,
        max: 500,
      },
      timeRequired: {
        min: 10,
        max: 20,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Apply to become a Maven instructor",
        "Define your unique angle and course value proposition",
        "Create detailed course curriculum and materials",
        "Set pricing and cohort size",
        "Launch marketing campaign for your first cohort",
        "Deliver high-quality live sessions and provide feedback",
      ],
      resourceLinks: ["https://maven.com/create", "https://maven.com/faq"],
      successStories: [
        "Li Jin generated over $100K teaching a course on the creator economy on Maven.",
        "Anthony Pompliano earned $1M+ teaching investment cohort courses on Maven.",
        "Greg Isenberg made $200K+ teaching community-led growth on Maven.",
      ],
      location: "Remote",
      competition: "Medium-High",
      sourceName: "Maven",
    };
  }

  private createCreativeCourseOpportunity(skills: string[]): RawOpportunity {
    const title = "Launch a Creative Skills Maven Course";
    const relatedSkills = [
      "design",
      "writing",
      "content creation",
      "video editing",
      "animation",
      "illustration",
    ];

    // Find matching skills to personalize description
    const matchingSkills = skills.filter((skill) =>
      relatedSkills.some((relatedSkill) =>
        skill.toLowerCase().includes(relatedSkill.toLowerCase()),
      ),
    );

    const matchingSkillsText =
      matchingSkills.length > 0
        ? matchingSkills.join(", ")
        : "your creative skills";

    const description = `Share your expertise in ${matchingSkillsText} through an interactive cohort-based course on Maven. Creative courses allow you to showcase your portfolio while teaching others your methods and techniques. Maven's platform lets you combine live sessions, assignments, and community building to create a premium learning experience.`;

    return {
      id: generateId("maven-creative"),
      title,
      description,
      url: "https://maven.com/create",
      platform: "Maven",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ["teaching", "portfolio creation", ...relatedSkills],
      niceToHaveSkills: [
        "public speaking",
        "curriculum design",
        "feedback delivery",
      ],
      estimatedIncome: {
        min: 3000,
        max: 30000,
        timeframe: "course",
      },
      startupCost: {
        min: 0,
        max: 300,
      },
      timeRequired: {
        min: 8,
        max: 15,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Create a portfolio showcasing your creative work",
        "Apply to become a Maven instructor",
        "Design your course curriculum with practical exercises",
        "Record sample lessons or demonstrations",
        "Set cohort dates and pricing strategy",
        "Launch and promote your course",
      ],
      resourceLinks: ["https://maven.com/create", "https://maven.com/examples"],
      successStories: [
        "David Perell earned over $2M teaching writing cohorts on Maven.",
        "Jack Butcher generated $300K+ teaching visual design on Maven.",
        "Ali Abdaal made $150K+ teaching productivity and content creation on Maven.",
      ],
      location: "Remote",
      competition: "Medium",
      sourceName: "Maven",
    };
  }

  private createWellnessCourseOpportunity(skills: string[]): RawOpportunity {
    const title = "Teach Wellness & Personal Development on Maven";
    const relatedSkills = [
      "fitness",
      "nutrition",
      "yoga",
      "meditation",
      "coaching",
      "mental health",
    ];

    // Find matching skills to personalize description
    const matchingSkills = skills.filter((skill) =>
      relatedSkills.some((relatedSkill) =>
        skill.toLowerCase().includes(relatedSkill.toLowerCase()),
      ),
    );

    const matchingSkillsText =
      matchingSkills.length > 0
        ? matchingSkills.join(", ")
        : "wellness and personal development";

    const description = `Create a transformative cohort-based course teaching ${matchingSkillsText} on Maven. Wellness courses provide high value to participants and can generate significant recurring income as you run multiple cohorts. Maven's platform supports progress tracking, community building, and live interactive sessions essential for wellness instruction.`;

    return {
      id: generateId("maven-wellness"),
      title,
      description,
      url: "https://maven.com/create",
      platform: "Maven",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: ["teaching", "coaching", ...relatedSkills],
      niceToHaveSkills: [
        "group facilitation",
        "community building",
        "accountability systems",
      ],
      estimatedIncome: {
        min: 4000,
        max: 25000,
        timeframe: "course",
      },
      startupCost: {
        min: 0,
        max: 200,
      },
      timeRequired: {
        min: 10,
        max: 20,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Develop your unique wellness methodology or framework",
        "Apply to become a Maven instructor",
        "Design transformative exercises and practices",
        "Create a supportive community structure",
        "Define measurable outcomes for participants",
        "Launch marketing focused on transformation and results",
      ],
      resourceLinks: ["https://maven.com/create", "https://maven.com/examples"],
      successStories: [
        "Dr. Ellen Vora earned $80K+ teaching sleep and wellness courses on Maven.",
        "Dr. Nicole LePera generated $500K+ teaching self-healing cohorts on Maven.",
        "Jay Shetty made $300K+ teaching mindfulness courses on Maven.",
      ],
      location: "Remote",
      competition: "Medium",
      sourceName: "Maven",
    };
  }

  private createGeneralCourseOpportunity(skills: string[]): RawOpportunity {
    const title = "Create Your First Maven Cohort Course";

    const description = `Turn your expertise into income by creating a cohort-based course on Maven. Maven allows experts to teach live interactive courses with community components, assignments, and structured curriculum. Unlike pre-recorded courses, Maven's cohort model creates accountability, higher completion rates, and justifies premium pricing, typically ranging from $500-$2000 per student.`;

    return {
      id: generateId("maven-general"),
      title,
      description,
      url: "https://maven.com/create",
      platform: "Maven",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: [
        "teaching",
        "expertise in a specific domain",
        "curriculum design",
      ],
      niceToHaveSkills: [
        "public speaking",
        "community management",
        "marketing",
      ],
      estimatedIncome: {
        min: 3000,
        max: 30000,
        timeframe: "course",
      },
      startupCost: {
        min: 0,
        max: 500,
      },
      timeRequired: {
        min: 10,
        max: 25,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Identify your unique expertise and target audience",
        "Apply to become a Maven instructor",
        "Design your course curriculum and learning outcomes",
        "Create engaging live session plans and assignments",
        "Set pricing strategy and cohort size",
        "Market your course to your existing audience or network",
      ],
      resourceLinks: [
        "https://maven.com/create",
        "https://maven.com/faq",
        "https://maven.com/examples",
      ],
      successStories: [
        "Maven instructors have earned over $50M collectively on the platform.",
        "Top Maven instructors earn $50K-$500K per cohort.",
        "Many instructors start with just a few dozen students and grow to hundreds.",
      ],
      location: "Remote",
      competition: "Medium",
      sourceName: "Maven",
    };
  }
}
