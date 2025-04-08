import OpenAI from "openai";
import { 
  MonetizationResults, 
  MonetizationOpportunity, 
  OpportunityType, 
  RiskLevel,
  Resource
} from "../../client/src/types";
import { v4 as uuidv4 } from "uuid";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-development" 
});

interface UserProfileInput {
  skills: string;
  timePerWeek: string;
  incomeGoal: string;
  riskTolerance: string;
  preference: string;
  additionalDetails?: string;
}

export async function generateMonetizationOpportunities(
  userProfile: UserProfileInput
): Promise<MonetizationResults> {
  try {
    const prompt = `
You are an advanced Web Research AI Agent whose job is to find the best real-world monetization opportunities for users based on their specific skills and preferences. Your goal is to not only provide practical options but also INSPIRE action through real success stories.

User Profile:
- Skills: ${userProfile.skills}
- Time per week: ${userProfile.timePerWeek}
- Income goal: ${userProfile.incomeGoal}
- Risk tolerance: ${userProfile.riskTolerance}
- Work preference: ${userProfile.preference}
${userProfile.additionalDetails ? `- Additional details: ${userProfile.additionalDetails}` : ''}

Search the web extensively including LinkedIn, Reddit, Discord public forums, Medium, Substack, Twitter, YouTube, marketplaces like Fiverr, Upwork, Gumroad, etc. to find the most realistic ways this user can make money with their skills. Use your knowledge of current online platforms, marketplaces, and trends from 2023-2024.

For each opportunity, I need you to provide:
1. Specific monetization paths that match these exact skills
2. MULTIPLE real success stories of people who started small and succeeded with this approach (with specific names, channels, profiles when available)
3. Detailed revenue journey information - how they started, how long it took to reach income milestones
4. Realistic income ranges based on current market rates and platform take rates
5. Actual startup costs including any software, equipment, or platform fees
6. Very specific step-by-step instructions to start within one week

CRUCIAL: For each opportunity, find and include 2-3 INSPIRATIONAL SUCCESS STORIES of real people who started from scratch in this field. Include their journey details, challenges they overcame, how long it took them to reach income goals, and direct links to their profiles/content.

For each path, return:
- Opportunity Name
- Type (one of: "Freelance", "Digital Product", "Content Creation", "Service-Based", "Passive Income", "Info Product")
- How It Works (brief explanation)
- Estimated Income Potential (as a range)
- Startup Cost (Low/Medium/High + dollar range)
- Risk Level (Low/Medium/High)
- Step-by-Step "How to Start" (list of steps)
- Useful Links (Reddit, YouTube, Fiverr, Gumroad, etc. with titles and URLs)

Make sure your suggestions are:
- Realistic and current (not vague "teach online" or "start a blog")
- Based on current demand or trends
- Actionable within a week

Respond with JSON that follows this exact structure:
{
  "opportunities": [
    {
      "id": "unique-id",
      "title": "Opportunity Name",
      "type": "OpportunityType",
      "icon": "icon-name",
      "description": "How it works explanation",
      "incomePotential": "$X-$Y/month",
      "startupCost": "Low/Medium/High ($X-$Y)",
      "riskLevel": "Low/Medium/High",
      "stepsToStart": ["Step 1", "Step 2", "Step 3", ...],
      "resources": [
        {
          "title": "Resource Name",
          "url": "https://example.com",
          "source": "Reddit/YouTube/etc"
        }
      ],
      "successStories": [
        {
          "name": "Real Person's Name",
          "background": "Brief description of their background/starting point",
          "journey": "Their path from beginner to success, including challenges and turning points",
          "outcome": "Current status and accomplishments",
          "profileUrl": "URL to their profile/portfolio/content"
        }
      ]
    }
  ],
  "userProfile": {
    "skills": ["skill1", "skill2"],
    "timeAvailability": "time-value",
    "incomeGoals": number,
    "riskTolerance": "risk-value",
    "preference": "preference-value"
  }
}

Only return real and up-to-date monetization options based on current market demand.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an advanced AI Web Research Agent with these capabilities:
- Searching the internet for current monetization opportunities, platforms, and market trends
- Finding real examples of successful people using their skills to make money
- Providing actionable, specific advice tailored to a person's exact skills
- Creating detailed step-by-step guides that can be implemented within a week
- Focusing only on realistic opportunities with verifiable examples from 2023-2024
- Finding actual links to resources, communities, and marketplaces where people can start immediately
- Discovering INSPIRATIONAL SUCCESS STORIES from LinkedIn, Medium, Substack, Twitter, Reddit, YouTube etc.

Approach each monetization opportunity like a thorough researcher AND storyteller who:
1. Validates real demand exists on current platforms
2. Identifies specific individuals who started from zero and succeeded
3. Discovers the journey stories of real people (their struggles, breakthroughs, milestones)
4. Verifies that someone could realistically start within one week
5. Provides precise, platform-specific instructions (not general advice)
6. Includes direct links to success stories, examples, templates, and communities
7. Highlights "from zero to hero" narratives that INSPIRE action`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    // Parse the response
    const parsedResponse = JSON.parse(content);
    
    // Add unique IDs to opportunities if not already present
    parsedResponse.opportunities.forEach((opportunity: any) => {
      if (!opportunity.id) {
        opportunity.id = uuidv4();
      }
    });

    // Convert skills from string to array if needed
    if (typeof parsedResponse.userProfile.skills === 'string') {
      parsedResponse.userProfile.skills = parsedResponse.userProfile.skills.split(',').map((s: string) => s.trim());
    }

    return parsedResponse as MonetizationResults;
  } catch (error) {
    console.error("Error in OpenAI API call:", error);
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
