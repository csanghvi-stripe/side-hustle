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
}

export async function generateMonetizationOpportunities(
  userProfile: UserProfileInput
): Promise<MonetizationResults> {
  try {
    const prompt = `
You are a web research agent helping people monetize their skills.

User Profile:
- Skills: ${userProfile.skills}
- Time per week: ${userProfile.timePerWeek}
- Income goal: ${userProfile.incomeGoal}
- Risk: ${userProfile.riskTolerance}
- Preference: ${userProfile.preference}

Search Reddit, YouTube, Fiverr, Gumroad, Substack, and other real-world sources to find:
- Specific monetization paths for these skills
- Examples of people doing it
- How they make money
- Steps to start + useful links

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
          content: "You are a monetization expert who helps people find real ways to make money with their skills."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
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
