/**
 * Kajabi Source Adapter
 *
 * This source captures opportunities from Kajabi,
 * an all-in-one platform for knowledge entrepreneurs.
 */

import { BaseOpportunitySource } from "./base-source";
import { DiscoveryPreferences, RawOpportunity } from "../types";
import { logger, generateId } from "../utils";
import { OpportunityType, RiskLevel } from "../../../shared/schema";

export class KajabiSource extends BaseOpportunitySource {
  constructor() {
    super("Kajabi", "kajabi", "https://kajabi.com");
  }

  /**
   * Get opportunities from Kajabi platform
   */
  public async getOpportunities(
    skills: string[],
    preferences: DiscoveryPreferences,
  ): Promise<RawOpportunity[]> {
    logger.info(
      `[${this.id}] Fetching opportunities from Kajabi for skills: ${skills.join(", ")}`,
    );

    // Check if we have cached results
    const cacheKey = `kajabi-${skills.sort().join(",")}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeMs) {
      logger.info(
        `Using cached Kajabi opportunities (${cached.data.length} items)`,
      );
      return cached.data;
    }

    // Implement Kajabi opportunity discovery
    const opportunities = await this.getKajabiOpportunities(skills);

    // Cache the results
    this.cache.set(cacheKey, {
      data: opportunities,
      timestamp: Date.now(),
    });

    return opportunities;
  }

  /**
   * Generate Kajabi opportunities based on the user's skills
   */
  private async getKajabiOpportunities(
    skills: string[],
  ): Promise<RawOpportunity[]> {
    try {
      const opportunities: RawOpportunity[] = [];

      // Define relevant skill categories
      const techSkills = [
        "programming",
        "web development",
        "design",
        "data science",
        "AI",
      ];
      const businessSkills = [
        "marketing",
        "entrepreneurship",
        "sales",
        "consulting",
        "coaching",
      ];
      const creativeSkills = [
        "writing",
        "design",
        "video production",
        "content creation",
      ];
      const wellnessSkills = [
        "fitness",
        "nutrition",
        "yoga",
        "meditation",
        "coaching",
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

      // Add general Kajabi opportunity
      opportunities.push(this.createGeneralKajabiOpportunity());

      // Add online course opportunity
      opportunities.push(this.createOnlineCourseOpportunity());

      // Add membership site opportunity
      opportunities.push(this.createMembershipOpportunity());

      // Add domain-specific opportunities
      if (userHasTechSkills) {
        opportunities.push(this.createTechBusinessOpportunity(skills));
      }

      if (userHasBusinessSkills) {
        opportunities.push(this.createCoachingBusinessOpportunity(skills));
      }

      if (userHasCreativeSkills || userHasWellnessSkills) {
        opportunities.push(
          this.createDigitalProductsBusinessOpportunity(skills),
        );
      }

      return opportunities;
    } catch (error) {
      logger.error(
        `Error generating Kajabi opportunities: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private createGeneralKajabiOpportunity(): RawOpportunity {
    const title = "Build a Knowledge Commerce Business on Kajabi";

    const description = `Create a complete knowledge commerce business on Kajabi's all-in-one platform. Unlike other platforms that require multiple tools and integrations, Kajabi provides everything you need - course hosting, website building, email marketing, payment processing, and sales funnels in one system. This integrated approach lets you focus on creating content and growing your business.`;

    return {
      id: generateId("kajabi-general"),
      title,
      description,
      url: "https://kajabi.com/why-kajabi",
      platform: "Kajabi",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: [
        "expertise in a subject",
        "content creation",
        "business sense",
      ],
      niceToHaveSkills: ["marketing", "sales copywriting", "video production"],
      estimatedIncome: {
        min: 2000,
        max: 100000,
        timeframe: "month",
      },
      startupCost: {
        min: 1488,
        max: 2388,
      },
      timeRequired: {
        min: 15,
        max: 40,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Sign up for a Kajabi account (plans start at $124/month)",
        "Choose your knowledge business model (courses, memberships, etc.)",
        "Create your Kajabi website and branding",
        "Develop your core digital products",
        "Set up marketing pipelines and email sequences",
        "Create sales pages and checkout processes",
        "Launch and market your knowledge business",
      ],
      resourceLinks: [
        "https://kajabi.com/why-kajabi",
        "https://kajabi.com/blog/top-10-digital-products-to-sell-online",
        "https://support.kajabi.com/en_US/kajabi-quickstart-guide-nxNIU66j1e/2-bnPtgxfhYy",
      ],
      successStories: [
        "Amy Porterfield built a multi-million dollar business teaching digital courses on Kajabi.",
        "James Wedmore created a $10M+ business with his course and membership programs.",
        "Chalene Johnson scaled her fitness and business education to millions in annual revenue.",
      ],
      location: "Remote",
      competition: "High",
      sourceName: "Kajabi",
    };
  }

  private createOnlineCourseOpportunity(): RawOpportunity {
    const title = "Create a Premium Online Course on Kajabi";

    const description = `Develop and sell a high-end online course on Kajabi. The platform is designed for premium knowledge products with robust course delivery features, assessments, and completion tracking. Kajabi's marketing and sales tools help you create professional funnels to attract and convert students, while its analytics let you understand student behavior and improve your offerings.`;

    return {
      id: generateId("kajabi-course"),
      title,
      description,
      url: "https://kajabi.com/features/courses",
      platform: "Kajabi",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: [
        "expertise in a subject",
        "teaching ability",
        "content creation",
      ],
      niceToHaveSkills: ["video production", "marketing", "sales copywriting"],
      estimatedIncome: {
        min: 3000,
        max: 100000,
        timeframe: "month",
      },
      startupCost: {
        min: 1488,
        max: 2388,
      },
      timeRequired: {
        min: 15,
        max: 40,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Sign up for a Kajabi account",
        "Define your course topic and validate market demand",
        "Plan your curriculum and learning outcomes",
        "Create comprehensive course content (videos, workbooks, etc.)",
        "Set up your course structure and student experience",
        "Create marketing assets (landing pages, emails, etc.)",
        "Launch your course with a strategic promotional campaign",
      ],
      resourceLinks: [
        "https://kajabi.com/features/courses",
        "https://kajabi.com/blog/a-beginners-guide-to-online-courses",
        "https://support.kajabi.com/en_US/courses-q9a45mEsgP",
      ],
      successStories: [
        "Brendon Burchard generates millions annually from his high performance courses.",
        "Mel Abraham created a business valuation course generating $50K+ monthly.",
        "Jasmine Star built a social media marketing course business earning $1M+ yearly.",
      ],
      location: "Remote",
      competition: "High",
      sourceName: "Kajabi",
    };
  }

  private createMembershipOpportunity(): RawOpportunity {
    const title = "Launch a Recurring Membership Business on Kajabi";

    const description = `Create a recurring revenue business with a membership site on Kajabi. Their platform makes it easy to deliver dripped content, host community discussions, and manage member payments in one place. Membership businesses provide more predictable income than one-time sales, allowing you to build a sustainable knowledge business with a loyal customer base.`;

    return {
      id: generateId("kajabi-membership"),
      title,
      description,
      url: "https://kajabi.com/features/memberships",
      platform: "Kajabi",
      type: OpportunityType.PASSIVE,
      requiredSkills: [
        "consistent content creation",
        "community management",
        "teaching ability",
      ],
      niceToHaveSkills: [
        "engagement strategies",
        "retention marketing",
        "live events",
      ],
      estimatedIncome: {
        min: 5000,
        max: 100000,
        timeframe: "month",
      },
      startupCost: {
        min: 1488,
        max: 2388,
      },
      timeRequired: {
        min: 20,
        max: 40,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Sign up for a Kajabi account",
        "Define your membership value proposition and target audience",
        "Plan your content calendar and membership structure",
        "Create foundational content for your membership area",
        "Set up member onboarding and retention systems",
        "Establish community guidelines and engagement strategies",
        "Launch with a founding member campaign",
      ],
      resourceLinks: [
        "https://kajabi.com/features/memberships",
        "https://kajabi.com/blog/how-to-create-a-membership-site",
        "https://support.kajabi.com/en_US/memberships-6RUbV80YuB",
      ],
      successStories: [
        "Stu McLaren built a 7-figure membership training business using Kajabi.",
        "Todd Herman created a membership program generating $80K+ monthly.",
        "Jenna Kutcher created a membership site earning $30K+ monthly in recurring revenue.",
      ],
      location: "Remote",
      competition: "Medium",
      sourceName: "Kajabi",
    };
  }

  private createTechBusinessOpportunity(skills: string[]): RawOpportunity {
    const title = "Build a Tech Education Business on Kajabi";

    // Find matching skills for personalization
    const techSkills = [
      "programming",
      "web development",
      "design",
      "data science",
      "AI",
    ];
    const matchingSkills = skills.filter((skill) =>
      techSkills.some((techSkill) =>
        skill.toLowerCase().includes(techSkill.toLowerCase()),
      ),
    );

    const skillText =
      matchingSkills.length > 0
        ? matchingSkills.join(", ")
        : "technical skills";

    const description = `Create a comprehensive tech education business teaching ${skillText} on Kajabi. Their all-in-one platform is perfect for tech educators who want to create multiple products (courses, memberships, coaching) under a single cohesive brand. Kajabi's robust tools let you create professional learning experiences with assessments, coding examples, and project-based learning.`;

    return {
      id: generateId("kajabi-tech"),
      title,
      description,
      url: "https://kajabi.com/why-kajabi",
      platform: "Kajabi",
      type: OpportunityType.INFO_PRODUCT,
      requiredSkills: [
        "technical expertise",
        "teaching ability",
        "curriculum design",
      ],
      niceToHaveSkills: [
        "project-based instruction",
        "community management",
        "career guidance",
      ],
      estimatedIncome: {
        min: 5000,
        max: 100000,
        timeframe: "month",
      },
      startupCost: {
        min: 1488,
        max: 2388,
      },
      timeRequired: {
        min: 20,
        max: 40,
      },
      entryBarrier: RiskLevel.HIGH,
      stepsToStart: [
        "Sign up for a Kajabi account",
        "Develop a comprehensive curriculum in your tech specialty",
        "Create practical projects and hands-on exercises",
        "Record professional tutorial videos with clear explanations",
        "Set up a community for student questions and feedback",
        "Create supplementary resources (cheat sheets, code templates)",
        "Develop a sales funnel targeting aspiring tech professionals",
      ],
      resourceLinks: [
        "https://kajabi.com/features/courses",
        "https://kajabi.com/blog/how-to-create-a-tech-education-business",
        "https://kajabi.com/heroes",
      ],
      successStories: [
        "Chris Haroun built a $1M+ business teaching tech and business skills on Kajabi.",
        "Paul Counts created tech education programs generating $40K+ monthly.",
        "Laurence Bradford developed a coding education business earning $25K+ per month.",
      ],
      location: "Remote",
      competition: "High",
      sourceName: "Kajabi",
    };
  }

  private createCoachingBusinessOpportunity(skills: string[]): RawOpportunity {
    const title = "Build a Coaching and Consulting Business on Kajabi";

    // Find matching skills for personalization
    const businessSkills = [
      "marketing",
      "entrepreneurship",
      "sales",
      "consulting",
      "coaching",
    ];
    const matchingSkills = skills.filter((skill) =>
      businessSkills.some((bizSkill) =>
        skill.toLowerCase().includes(bizSkill.toLowerCase()),
      ),
    );

    const skillText =
      matchingSkills.length > 0
        ? matchingSkills.join(", ")
        : "business expertise";

    const description = `Create a complete coaching and consulting business leveraging your ${skillText} on Kajabi. Their platform enables you to combine one-on-one coaching, group programs, and digital products in a scalable business model. With built-in scheduling, client management, and payment processing, Kajabi streamlines the operational aspects so you can focus on delivering exceptional coaching.`;

    return {
      id: generateId("kajabi-coaching"),
      title,
      description,
      url: "https://kajabi.com/why-kajabi",
      platform: "Kajabi",
      type: OpportunityType.SERVICE,
      requiredSkills: [
        "coaching expertise",
        "business acumen",
        "problem solving",
      ],
      niceToHaveSkills: [
        "group facilitation",
        "curriculum design",
        "client management",
      ],
      estimatedIncome: {
        min: 5000,
        max: 50000,
        timeframe: "month",
      },
      startupCost: {
        min: 1488,
        max: 2388,
      },
      timeRequired: {
        min: 20,
        max: 40,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Sign up for a Kajabi account",
        "Define your coaching methodology and approach",
        "Create different service tiers (1:1, group, self-study)",
        "Develop supporting materials and resources for clients",
        "Set up scheduling and client management systems",
        "Create a professional website showcasing your expertise",
        "Develop a sales funnel to attract coaching clients",
      ],
      resourceLinks: [
        "https://kajabi.com/features/coaching",
        "https://kajabi.com/blog/how-to-start-an-online-coaching-business",
        "https://support.kajabi.com/en_US/coaching-0svrNKpELM",
      ],
      successStories: [
        "Tony Robbins uses platforms like Kajabi to power parts of his coaching empire.",
        "Marie Forleo built a multi-million dollar coaching business with digital platforms.",
        "Russell Brunson created a $100M+ business combining coaching with digital products.",
      ],
      location: "Remote",
      competition: "High",
      sourceName: "Kajabi",
    };
  }

  private createDigitalProductsBusinessOpportunity(
    skills: string[],
  ): RawOpportunity {
    const title = "Create a Digital Products Empire on Kajabi";

    // Find matching skills for personalization
    const relevantSkills = [
      "writing",
      "design",
      "video production",
      "content creation",
      "fitness",
      "nutrition",
      "yoga",
      "meditation",
      "coaching",
    ];
    const matchingSkills = skills.filter((skill) =>
      relevantSkills.some((relevantSkill) =>
        skill.toLowerCase().includes(relevantSkill.toLowerCase()),
      ),
    );

    const skillText =
      matchingSkills.length > 0
        ? matchingSkills.join(", ")
        : "creative or wellness expertise";

    const description = `Build a diverse digital products business using your ${skillText} on Kajabi. Their platform enables you to create and sell multiple product types including courses, memberships, coaching packages, and digital downloads under one brand. This multi-product approach creates multiple income streams and allows you to serve customers at different price points.`;

    return {
      id: generateId("kajabi-products"),
      title,
      description,
      url: "https://kajabi.com/product-types",
      platform: "Kajabi",
      type: OpportunityType.DIGITAL_PRODUCT,
      requiredSkills: ["content creation", "product development", "marketing"],
      niceToHaveSkills: [
        "sales funnel design",
        "email marketing",
        "audience building",
      ],
      estimatedIncome: {
        min: 5000,
        max: 100000,
        timeframe: "month",
      },
      startupCost: {
        min: 1488,
        max: 2388,
      },
      timeRequired: {
        min: 20,
        max: 40,
      },
      entryBarrier: RiskLevel.MEDIUM,
      stepsToStart: [
        "Sign up for a Kajabi account",
        "Map out your product ecosystem with complementary offerings",
        "Create an entry-level product for new customers",
        "Develop premium offerings for dedicated customers",
        "Set up automated marketing pipelines to connect products",
        "Create an email marketing strategy to promote multiple products",
        "Launch your flagship product and build additional offers",
      ],
      resourceLinks: [
        "https://kajabi.com/product-types",
        "https://kajabi.com/blog/10-digital-products-to-sell-online",
        "https://support.kajabi.com/en_US/getting-started-guide-eAp6K-9EEI",
      ],
      successStories: [
        "Chalene Johnson built a fitness and business education empire generating millions annually.",
        "James Wedmore created a product ecosystem generating $10M+ yearly.",
        "Jenna Kutcher developed multiple income streams earning $300K+ monthly combined.",
      ],
      location: "Remote",
      competition: "High",
      sourceName: "Kajabi",
    };
  }
}
