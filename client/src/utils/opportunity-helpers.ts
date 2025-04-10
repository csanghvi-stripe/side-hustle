/**
 * Utility functions for handling opportunity types and normalization
 * across components.
 */

/**
 * Normalizes opportunity types from various data sources to match
 * our standard display categories. This ensures consistent display
 * and filtering regardless of the data source.
 * 
 * @param type - The raw opportunity type string from any data source
 * @returns A normalized opportunity type string
 */
export function normalizeOpportunityType(type?: string | null): string {
  // Default to "Freelance" if type is missing or invalid
  if (!type || typeof type !== "string") {
    return "Freelance";
  }

  // Convert to title case for consistency
  let normalizedType = type;
  
  // Handle special cases where the type might be in different formats from different sources
  const lowerType = type.toLowerCase();
  
  // Map to our standard display categories
  if (
    lowerType.includes("freelance") ||
    lowerType.includes("freelancing") ||
    lowerType === "freelance" ||
    lowerType === "consulting" ||
    lowerType === "contract"
  ) {
    return "Freelance";
  } else if (
    lowerType.includes("digital") ||
    lowerType.includes("product") ||
    lowerType.includes("digital product") ||
    lowerType.includes("e-commerce") ||
    lowerType.includes("ecommerce") ||
    lowerType.includes("app") ||
    lowerType.includes("application") ||
    lowerType.includes("saas")
  ) {
    return "Digital Product";
  } else if (
    lowerType.includes("content") ||
    lowerType.includes("writing") ||
    lowerType.includes("blog") ||
    lowerType.includes("content creation") ||
    lowerType.includes("youtube") ||
    lowerType.includes("video") ||
    lowerType.includes("author") ||
    lowerType.includes("podcasting")
  ) {
    return "Content Creation";
  } else if (
    lowerType.includes("service") ||
    lowerType.includes("agency") ||
    lowerType.includes("service-based") ||
    lowerType.includes("coaching") ||
    lowerType.includes("consulting firm") ||
    lowerType.includes("offer services")
  ) {
    return "Service-Based";
  } else if (
    lowerType.includes("passive") ||
    lowerType.includes("investment") ||
    lowerType.includes("passive income") ||
    lowerType.includes("rental") ||
    lowerType.includes("affiliate") ||
    lowerType.includes("royalty")
  ) {
    return "Passive Income";
  } else if (
    lowerType.includes("info") ||
    lowerType.includes("course") ||
    lowerType.includes("education") ||
    lowerType.includes("info product") ||
    lowerType.includes("ebook") ||
    lowerType.includes("training") ||
    lowerType.includes("workshop") ||
    lowerType.includes("webinar")
  ) {
    return "Info Product";
  }
  
  // If the type doesn't match any of our categories, default to "Freelance"
  return "Freelance";
}

/**
 * Get an opportunity's category based on its full details
 * This can be used when only the opportunity object is available
 * 
 * @param opportunity - The full opportunity object 
 * @returns A normalized opportunity type string
 */
export function getOpportunityCategory(opportunity: any): string {
  // Parse opportunity data if it's a string
  let parsedData: any = opportunity.opportunityData;
  
  try {
    if (typeof opportunity.opportunityData === "string") {
      parsedData = JSON.parse(opportunity.opportunityData);
    }
  } catch (error) {
    console.error("Failed to parse opportunity data:", error);
  }
  
  // Try to get the type from the parsed data or directly from the opportunity
  const rawType = 
    (parsedData && parsedData.type) || 
    opportunity.type || 
    "Freelance";
    
  // Normalize the type
  return normalizeOpportunityType(rawType);
}

/**
 * Categorizes opportunities for display in tabs or filters
 * 
 * @param opportunities - Array of opportunity objects
 * @returns Object with opportunities grouped by category
 */
export function categorizeOpportunities(opportunities: any[]) {
  const categorized: Record<string, any[]> = {
    "Freelance": [],
    "Digital Product": [],
    "Content Creation": [],
    "Service-Based": [],
    "Passive Income": [],
    "Info Product": []
  };
  
  opportunities.forEach(opportunity => {
    const category = getOpportunityCategory(opportunity);
    
    // Add to appropriate category
    if (categorized[category]) {
      categorized[category].push(opportunity);
    } else {
      // Default to Freelance if category doesn't exist
      categorized["Freelance"].push(opportunity);
    }
  });
  
  return categorized;
}

/**
 * Gets descriptive text for each opportunity type
 * 
 * @param type - The normalized opportunity type
 * @returns Descriptive text about the opportunity type
 */
export function getOpportunityTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    "Freelance": "Freelancing allows you to offer specialized services directly to clients. It's flexible, low-cost to start, and lets you leverage existing skills.",
    "Digital Product": "Digital products are scalable assets you create once and sell repeatedly. These include software, templates, plugins, or digital downloads.",
    "Content Creation": "Content creation involves producing valuable media like blogs, videos, podcasts, or newsletters that can be monetized through ads, sponsorships, or subscriptions.",
    "Service-Based": "Service-based businesses provide specialized expertise to clients with ongoing relationships and potentially scalable operations beyond solo freelancing.",
    "Passive Income": "Passive income streams require significant upfront effort but can generate ongoing revenue with minimal maintenance once established.",
    "Info Product": "Information products package your knowledge into valuable formats like courses, ebooks, or membership sites that can be sold repeatedly."
  };
  
  return descriptions[type] || "This opportunity lets you leverage your skills to generate income through various channels.";
}