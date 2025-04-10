/**
 * Prompt Management System
 * 
 * This module manages the prompts used for AI services like Anthropic,
 * tracking their performance, automatically improving them based on
 * success/failure patterns, and providing a flexible templating system.
 */

import { logger } from './utils';
import { DiscoveryPreferences } from './types';

interface PromptTemplate {
  id: string;
  version: number;
  description: string;
  template: string;
  variables: string[];
  successRate?: number;
  lastUsed?: Date;
}

export class PromptManager {
  private templates: Map<string, PromptTemplate[]> = new Map();
  private defaultTemplates: Record<string, PromptTemplate> = {
    system: {
      id: 'system-default',
      version: 1,
      description: 'Default system prompt for opportunity generation',
      template: `You are an expert career and side hustle advisor specializing in helping people discover personalized monetization opportunities based on their skills and preferences. Your task is to suggest specific, actionable, and current monetization opportunities tailored to the user's skills, time availability, risk tolerance, and income goals.

Your recommendations must be:
1. Realistic - Grounded in the current market reality
2. Specific - With clear action steps and resource recommendations
3. Tailored - Precisely matched to the user's skill set
4. Diverse - Representing different opportunity types and income models
5. Inspiring - Including success stories of real people
6. Actionable - Something the user could potentially start within 1-4 weeks

For each opportunity, include:
- Title and short description
- Required skills and nice-to-have skills
- Estimated income range and timeline
- Startup costs
- Risk level assessment
- Clear steps to get started
- Success story of someone with similar background
- Relevant resources for learning more

You will output this information in a structured JSON format for direct use in an application.`,
      variables: []
    },
    opportunityGeneration: {
      id: 'opportunity-generation-default',
      version: 1,
      description: 'Default opportunity generation prompt',
      template: `Please suggest {{count}} personalized monetization opportunities (side hustles, freelance work, digital products, etc.) based on the following profile:

SKILLS: {{skillsText}}

TIME AVAILABILITY: {{timeText}}

RISK TOLERANCE: {{riskText}}

INCOME GOAL: {{incomeText}}

WORK PREFERENCE: {{prefText}}

ADDITIONAL DETAILS: {{detailsText}}

For each opportunity suggestion, please provide:
1. A specific title (not generic like "Freelance Writing" but specific like "Technical Documentation for SaaS Companies")
2. A compelling description that explains the opportunity
3. Required skills (from their skill list) and nice-to-have skills
4. Opportunity type (FREELANCE, DIGITAL_PRODUCT, CONTENT, SERVICE, PASSIVE, INFO_PRODUCT)
5. Estimated income range (min-max) and timeframe (hourly, monthly, etc.)
6. Startup costs (min-max)
7. Time required in hours per week (min-max)
8. Entry barrier (LOW, MEDIUM, HIGH)
9. Market demand (LOW, MEDIUM, HIGH)
10. 3-5 clear steps to get started
11. A realistic success story of someone with similar background
12. 2-3 specific resources (with titles and URLs) to learn more

Please structure your response as a valid JSON array of opportunities that I can parse directly with JSON.parse(). The structure should be like this for each opportunity:

{
  "title": "Specific Opportunity Title",
  "description": "Detailed description...",
  "requiredSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill3", "skill4"],
  "type": "FREELANCE", (or other valid type)
  "estimatedIncome": { "min": 50, "max": 150, "timeframe": "hour" },
  "startupCost": { "min": 100, "max": 500 },
  "timeRequired": { "min": 10, "max": 20 },
  "entryBarrier": "MEDIUM", (LOW, MEDIUM, or HIGH)
  "marketDemand": "HIGH", (LOW, MEDIUM, or HIGH)
  "stepsToStart": ["Step 1...", "Step 2...", "Step 3..."],
  "successStory": {
    "name": "Person's Name",
    "background": "Their background...",
    "journey": "How they started...",
    "outcome": "Current results..."
  },
  "resources": [
    { "title": "Resource Title", "url": "https://example.com" },
    { "title": "Another Resource", "url": "https://anotherexample.com" }
  ]
}

Focus on current (2025) opportunities that are specific to their skills. Please make sure the JSON is valid and directly parseable.

IMPORTANT: Your response must be valid JSON that can be parsed directly with JSON.parse(). Do not include any text before or after the JSON.`,
      variables: ['count', 'skillsText', 'timeText', 'riskText', 'incomeText', 'prefText', 'detailsText']
    },
    
    // Add a JSON-focused template that handles common issues
    opportunityGenerationJsonFocus: {
      id: 'opportunity-generation-json-focus',
      version: 1,
      description: 'JSON-focused opportunity generation prompt with stronger validation',
      template: `Generate {{count}} personalized monetization opportunities as a valid JSON array. Use only the user's skills: {{skillsText}}, time availability: {{timeText}}, risk tolerance: {{riskText}}, income goal: {{incomeText}}.

RESPOND ONLY WITH A JSON ARRAY WITH NO ADDITIONAL TEXT. Each object in the array must have this exact structure:
{
  "title": "string",
  "description": "string",
  "requiredSkills": ["string"],
  "niceToHaveSkills": ["string"],
  "type": "FREELANCE", 
  "estimatedIncome": { "min": number, "max": number, "timeframe": "string" },
  "startupCost": { "min": number, "max": number },
  "timeRequired": { "min": number, "max": number },
  "entryBarrier": "MEDIUM",
  "marketDemand": "HIGH",
  "stepsToStart": ["string"],
  "successStory": {
    "name": "string",
    "background": "string",
    "journey": "string",
    "outcome": "string"
  },
  "resources": [
    { "title": "string", "url": "string" }
  ]
}

- "type" must be one of: "FREELANCE", "DIGITAL_PRODUCT", "CONTENT", "SERVICE", "PASSIVE", "INFO_PRODUCT"
- "entryBarrier" and "marketDemand" must be one of: "LOW", "MEDIUM", "HIGH"
- All arrays must be properly formatted
- All fields are required
- All JSON must be properly escaped

IMPORTANT: Only output valid JSON. NO MARKDOWN. NO INTRODUCTIONS. NO EXPLANATIONS. JSON ARRAY ONLY.`,
      variables: ['count', 'skillsText', 'timeText', 'riskText', 'incomeText', 'prefText', 'detailsText']
    }
  };
  
  // Error tracking
  private errorCounts: Record<string, number> = {};
  private lastSuccessfulResponses: Record<string, string> = {};

  constructor() {
    // Initialize with default templates
    this.templates.set('system', [this.defaultTemplates.system]);
    this.templates.set('opportunityGeneration', [
      this.defaultTemplates.opportunityGeneration,
      this.defaultTemplates.opportunityGenerationJsonFocus
    ]);
    
    // Also add the same templates with the underscored version of the key for backward compatibility
    this.templates.set('opportunity_generation', [
      this.defaultTemplates.opportunityGeneration,
      this.defaultTemplates.opportunityGenerationJsonFocus
    ]);
    
    // Log available templates for debugging
    const templateTypes = Array.from(this.templates.keys());
    logger.info(`Initialized prompt manager with templates for types: ${templateTypes.join(', ')}`);
  }

  /**
   * Get the best performing template for a given type
   */
  public getTemplate(type: string): PromptTemplate {
    const templates = this.templates.get(type) || [];
    if (templates.length === 0) {
      logger.warn(`No template found for type: ${type}, using fallback`);
      return this.defaultTemplates[type] || {
        id: `${type}-fallback`,
        version: 1,
        description: `Fallback template for ${type}`,
        template: '',
        variables: []
      };
    }
    
    // Sort by success rate and use the best performing one
    return [...templates].sort((a, b) => 
      (b.successRate || 0) - (a.successRate || 0)
    )[0];
  }

  /**
   * Fill template with variables
   */
  public fillTemplate(type: string, variables: Record<string, any>): string {
    const template = this.getTemplate(type);
    let filledTemplate = template.template;
    
    // Replace all variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      filledTemplate = filledTemplate.replace(
        new RegExp(`{{${key}}}`, 'g'), 
        String(value)
      );
    });
    
    return filledTemplate;
  }

  /**
   * Track successful response
   */
  public trackSuccess(type: string, templateId: string, response: string): void {
    const templates = this.templates.get(type) || [];
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      // Increase success rate
      const previousSuccesses = (template.successRate || 0) * 100;
      const newSuccessRate = (previousSuccesses + 1) / (previousSuccesses + 1 + (this.errorCounts[templateId] || 0));
      template.successRate = newSuccessRate;
      template.lastUsed = new Date();
      
      // Store successful response for learning
      this.lastSuccessfulResponses[templateId] = response;
      
      logger.info(`Tracked successful use of template: ${templateId}, new success rate: ${newSuccessRate.toFixed(2)}`);
    }
  }

  /**
   * Track error
   */
  public trackError(type: string, templateId: string, error: string): void {
    this.errorCounts[templateId] = (this.errorCounts[templateId] || 0) + 1;
    
    logger.warn(`Tracked error for template ${templateId}: ${error}, count: ${this.errorCounts[templateId]}`);
    
    // If we have consistent errors, create an alternative template
    if (this.errorCounts[templateId] >= 3) {
      this.createAlternativeTemplate(type, templateId, error);
    }
  }

  /**
   * Create alternative template based on errors
   */
  private createAlternativeTemplate(type: string, originalId: string, error: string): void {
    const templates = this.templates.get(type) || [];
    const original = templates.find(t => t.id === originalId);
    
    if (!original) {
      logger.warn(`Cannot create alternative for non-existent template: ${originalId}`);
      return;
    }
    
    // Create a new version with modifications based on error type
    let newTemplate = { ...original };
    newTemplate.id = `${original.id}-v${original.version + 1}`;
    newTemplate.version = original.version + 1;
    newTemplate.successRate = 0;
    
    // Modify template based on error type (simplified logic)
    if (error.includes('not a function') || error.includes('extract JSON')) {
      // Make JSON format more explicit in the prompt
      newTemplate.template = newTemplate.template.replace(
        'JSON format', 
        'valid JSON format with no markdown formatting or additional text'
      );
      
      // Add a reminder about valid JSON at the end
      newTemplate.template += '\n\nIMPORTANT: Your response must be valid JSON that can be parsed directly with JSON.parse(). Do not include any text before or after the JSON. DO NOT use markdown formatting.';
    }
    
    // Add the new template to the collection
    this.templates.get(type)?.push(newTemplate);
    
    logger.info(`Created alternative template: ${newTemplate.id} based on error patterns`);
  }
}

export const promptManager = new PromptManager();