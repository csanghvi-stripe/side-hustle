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
You are an advanced Web Research AI Agent whose job is to find the best real-world monetization opportunities for users based on their specific skills and preferences.

User Profile:
- Skills: ${userProfile.skills}
- Time per week: ${userProfile.timePerWeek}
- Income goal: ${userProfile.incomeGoal}
- Risk tolerance: ${userProfile.riskTolerance}
- Work preference: ${userProfile.preference}
${userProfile.additionalDetails ? `- Additional details: ${userProfile.additionalDetails}` : ''}

You are to search the web extensively (forums, blogs, Reddit, YouTube, marketplaces like Fiverr, Upwork, Gumroad, Substack, etc.) to find the most realistic ways this user can make money with their skills. Use your knowledge of current online platforms, marketplaces, and trends from 2023-2024.

For each opportunity, I need you to provide:
- Specific monetization paths that match these exact skills
- Real examples of people who have succeeded with this approach (with specific names/channels/profiles when available)
- Realistic income ranges based on current market rates and platform take rates
- Actual startup costs including any software, equipment, or platform fees
- Very specific step-by-step instructions to start within one week

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

Approach each monetization opportunity like a thorough researcher who:
1. Validates real demand exists on current platforms
2. Checks actual earnings reports and testimonials from real people
3. Verifies that someone could realistically start within one week
4. Provides precise, platform-specific instructions (not general advice)
5. Includes direct links to examples, templates, and communities`
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
