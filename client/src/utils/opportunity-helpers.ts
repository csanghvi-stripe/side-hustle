import { OpportunityType } from "@shared/schema";

/**
 * Normalizes opportunity types from various formats into standard display formats
 * @param type The opportunity type string to normalize
 * @returns A display-friendly normalized opportunity type string
 */
export function normalizeOpportunityType(type: string | undefined): string {
  if (!type) {
    return "Freelance"; // Default value
  }
  
  // Convert to uppercase for comparison
  const typeUpperCase = type.toUpperCase();
  
  // Check for direct matches with enum values
  if (typeUpperCase === OpportunityType.FREELANCE || typeUpperCase === 'FREELANCING') {
    return "Freelance";
  } else if (typeUpperCase === OpportunityType.DIGITAL_PRODUCT) {
    return "Digital Product";
  } else if (typeUpperCase === OpportunityType.CONTENT || typeUpperCase === 'CONTENT_CREATION') {
    return "Content Creation";
  } else if (typeUpperCase === OpportunityType.SERVICE || typeUpperCase === 'SERVICE_BASED') {
    return "Service-Based";
  } else if (typeUpperCase === OpportunityType.PASSIVE || typeUpperCase === 'PASSIVE_INCOME') {
    return "Passive Income";
  } else if (typeUpperCase === OpportunityType.INFO_PRODUCT) {
    return "Info Product";
  } 
  
  // If no direct match, try case-insensitive substring matching
  const typeLowerCase = type.toLowerCase();
  
  if (typeLowerCase.includes('freelance') || typeLowerCase.includes('consulting')) {
    return "Freelance";
  } else if (typeLowerCase.includes('digital') || typeLowerCase.includes('product')) {
    return "Digital Product";
  } else if (typeLowerCase.includes('content') || typeLowerCase.includes('creation') || typeLowerCase.includes('blog')) {
    return "Content Creation";
  } else if (typeLowerCase.includes('service')) {
    return "Service-Based";
  } else if (typeLowerCase.includes('passive')) {
    return "Passive Income";
  } else if (typeLowerCase.includes('info') || typeLowerCase.includes('course')) {
    return "Info Product";
  }
  
  // Default fallback
  return "Freelance";
}

/**
 * Maps a normalized opportunity type to the corresponding database enum value
 * @param displayType The display-friendly opportunity type
 * @returns The corresponding OpportunityType enum value
 */
export function getOpportunityTypeEnum(displayType: string): OpportunityType {
  const displayTypeLower = displayType.toLowerCase();
  
  if (displayTypeLower.includes('freelance')) {
    return OpportunityType.FREELANCE;
  } else if (displayTypeLower.includes('digital') || displayTypeLower.includes('product')) {
    return OpportunityType.DIGITAL_PRODUCT;
  } else if (displayTypeLower.includes('content')) {
    return OpportunityType.CONTENT;
  } else if (displayTypeLower.includes('service')) {
    return OpportunityType.SERVICE;
  } else if (displayTypeLower.includes('passive')) {
    return OpportunityType.PASSIVE;
  } else if (displayTypeLower.includes('info')) {
    return OpportunityType.INFO_PRODUCT;
  }
  
  // Default
  return OpportunityType.FREELANCE;
}