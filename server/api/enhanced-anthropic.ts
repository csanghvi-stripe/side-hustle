import Anthropic from '@anthropic-ai/sdk';
import { User } from '@shared/schema';
import { 
  MonetizationResults, 
  OpportunityType, 
  RiskLevel, 
  UserMatch,
  UserProfile
} from '../../client/src/types';
import {
  searchOpportunities,
  searchSuccessStories,
  researchMarketRates
} from './web-search';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface UserProfileInput {
  skills: string;
  timePerWeek: string;
  incomeGoal: string;
  riskTolerance: string;
  preference: string;
  additionalDetails?: string;
  discoverable: boolean;
  allowMessages: boolean;
}

/**
 * Generate a list of similar users with matching skills
 * @param userSkills Array of user skills
 * @param discoverable Whether the user allows discovery by others
 * @returns Array of UserMatch objects
 */
function generateSimilarUsers(userSkills: string[], discoverable: boolean): UserMatch[] {
  // Only generate user matches if user allows discovery
  if (!discoverable) return [];
  
  // Create synthetic user matches based on skills
  const sampleUsers = [
    {
      id: 101,
      username: "alexcreative",
      displayName: "Alex Creative",
      profilePicture: "https://i.pravatar.cc/150?img=1",
      bio: "UI/UX designer and illustrator specializing in mobile interfaces",
      skills: ["design", "illustration", "UI/UX", "figma"],
      timeAvailability: "20-30 hours/week",
      discoverable: true,
      allowMessages: true
    },
    {
      id: 102,
      username: "samcoder",
      displayName: "Sam Developer",
      profilePicture: "https://i.pravatar.cc/150?img=2",
      bio: "Full-stack developer with 5+ years experience in React & Node",
      skills: ["javascript", "react", "node.js", "typescript"],
      timeAvailability: "10-20 hours/week",
      discoverable: true,
      allowMessages: true
    },
    {
      id: 103,
      username: "writerjordan",
      displayName: "Jordan Writer",
      profilePicture: "https://i.pravatar.cc/150?img=3",
      bio: "Content writer specializing in tech, finance and SaaS",
      skills: ["writing", "content creation", "blogging", "copywriting"],
      timeAvailability: "30+ hours/week",
      discoverable: true,
      allowMessages: true
    },
    {
      id: 104,
      username: "marketingpro",
      displayName: "Taylor Marketing",
      profilePicture: "https://i.pravatar.cc/150?img=4",
      bio: "Digital marketing specialist focused on growth strategies",
      skills: ["marketing", "SEO", "social media", "analytics"],
      timeAvailability: "20-30 hours/week",
      discoverable: true,
      allowMessages: true
    }
  ];
  
  const matches: UserMatch[] = [];
  
  // For each sample user, calculate match score based on overlapping skills
  for (const user of sampleUsers) {
    const matchedSkills = user.skills.filter(skill => 
      userSkills.some(userSkill => 
        userSkill.toLowerCase().includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(userSkill.toLowerCase())
      )
    );
    
    // Only include users with at least one matching skill
    if (matchedSkills.length > 0) {
      const matchScore = Math.min(100, Math.round((matchedSkills.length / userSkills.length) * 100));
      
      matches.push({
        user,
        matchScore,
        matchedSkills,
        commonInterests: ["monetization", "freelancing"]
      });
    }
  }
  
  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Enhanced monetization opportunity generator that combines AI with web research
 * @param userProfile User profile input
 * @returns Promise with monetization results
 */
export async function generateEnhancedMonetizationOpportunities(
  userProfile: UserProfileInput
): Promise<MonetizationResults> {
  try {
    // Extract skills as an array
    const skillsArray = userProfile.skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Step 1: Conduct web research for each opportunity type in parallel
    console.log("Starting web research for skills:", skillsArray);
    
    const opportunityTypes = [
      OpportunityType.FREELANCE,
      OpportunityType.DIGITAL_PRODUCT,
      OpportunityType.CONTENT,
      OpportunityType.SERVICE
    ];
    
    const researchPromises = opportunityTypes.map(async (type) => {
      const opportunities = await searchOpportunities(skillsArray, type);
      const successStories = await searchSuccessStories(skillsArray, type);
      const rateData = await researchMarketRates(skillsArray, type);
      
      return {
        type,
        opportunities,
        successStories,
        rateData
      };
    });
    
    const researchResults = await Promise.allSettled(researchPromises);
    
    // Compile research findings
    let webResearchData: Record<string, any> = {};
    researchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        webResearchData[data.type as string] = {
          opportunities: data.opportunities,
          successStories: data.successStories,
          rateData: data.rateData
        };
      }
    });
    
    // Step 2: Create system prompt for Anthropic with the web research data
    const systemPrompt = `You are a Monetization Discovery Agent specializing in helping people find ways to monetize their skills and time. Your goal is to provide highly personalized, realistic, and actionable monetization opportunities. 

I'm providing you with REAL web research data about current market opportunities, real-world success stories, and market rates for the user's skills. Use this data to create personalized recommendations.

For each opportunity:
1. Focus on opportunities that the user can START WITHIN ONE WEEK with their current skills
2. Include specific, detailed steps to get started
3. Provide realistic income potential based on the provided market rate data
4. Include a risk assessment considering time, financial investment, and competition
5. Reference the legitimate resources (websites, platforms, tools) from the research data
6. Include the real success stories of people with similar backgrounds who succeeded with this approach

Format each opportunity with:
- id: A unique string identifier
- title: Clear and concise name of the opportunity
- type: Category (Freelance, Digital Product, Content Creation, Service-Based, Passive Income, or Info Product)
- icon: A descriptive emoji that represents the opportunity
- description: 2-3 sentence explanation of what the opportunity entails
- incomePotential: Realistic monthly income range (low, medium, high estimates) based on the market rate data
- startupCost: Estimated initial investment needed (in dollars)
- riskLevel: Low, Medium, or High
- stepsToStart: 5-7 step-by-step actions to get started (be specific and reference real platforms)
- resources: 3-5 specific platforms, websites, or tools with URLs from the research data
- successStories: 1-2 brief, realistic stories of people who succeeded with similar backgrounds from the research data

Based on their skills, time availability, risk tolerance, and income goals, provide a MINIMUM of 4 and MAXIMUM of 6 highly tailored opportunities. Include a mix of opportunity types.`;

    // Create user prompt with profile information and web research
    const userPrompt = `Here's my profile for monetization discovery:

Skills: ${userProfile.skills}
Available time: ${userProfile.timePerWeek}
Income goal: ${userProfile.incomeGoal}
Risk tolerance: ${userProfile.riskTolerance}
Work preference: ${userProfile.preference}
Additional details: ${userProfile.additionalDetails || "None provided"}

I've conducted web research on monetization opportunities for these skills. Here's what I found:

${JSON.stringify(webResearchData, null, 2)}

Please analyze my profile and the web research data to suggest highly personalized, realistic monetization opportunities that leverage my skills and fit my constraints. Format your response as a JSON object with the array of monetization opportunities.`;

    // Call Anthropic API with the enhanced prompts
    console.log("Calling Anthropic API with research data...");
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.7,
    });

    // Extract response content
    const contentBlock = response.content[0];
    const content = contentBlock.type === 'text' ? (contentBlock as any).text : '';
    
    // Extract JSON from the response
    let jsonData: any;
    try {
      // Find JSON content in the response
      const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || 
                      content.match(/```\n([\s\S]*)\n```/) ||
                      content.match(/{[\s\S]*}/);
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      jsonData = JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON from Claude response:", error);
      console.log("Raw Claude response:", content);
      throw new Error("Failed to parse opportunities from AI response");
    }
    
    // Process opportunities and ensure they have required fields
    const opportunities = (jsonData.opportunities || []).map((opp: any) => ({
      id: opp.id || `opp-${Math.random().toString(36).substring(2, 10)}`,
      title: opp.title,
      type: opp.type as OpportunityType,
      icon: opp.icon || "💼",
      description: opp.description,
      incomePotential: opp.incomePotential,
      startupCost: opp.startupCost,
      riskLevel: opp.riskLevel as RiskLevel,
      stepsToStart: Array.isArray(opp.stepsToStart) ? opp.stepsToStart : [],
      resources: Array.isArray(opp.resources) ? opp.resources : [],
      successStories: Array.isArray(opp.successStories) ? opp.successStories : [],
    }));

    // Generate similar users based on user's skills
    const similarUsers = generateSimilarUsers(skillsArray, userProfile.discoverable);

    // Return formatted results
    return {
      opportunities,
      userProfile: {
        skills: skillsArray,
        timeAvailability: userProfile.timePerWeek,
        incomeGoals: parseInt(userProfile.incomeGoal.replace(/[^\d]/g, '')),
        riskTolerance: userProfile.riskTolerance,
        preference: userProfile.preference,
      },
      similarUsers,
      enhanced: true, // Indicate this was generated with the enhanced algorithm
    };
  } catch (error) {
    console.error("Error generating enhanced monetization opportunities:", error);
    throw error;
  }
}

// Keep the original function for backward compatibility
export { generateMonetizationOpportunities } from './anthropic';