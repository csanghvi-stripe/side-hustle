/**
 * Utility functions and shared helpers for the discovery engine
 */

// Logger utility for discovery engine
export const logger = {
  info: (message: string) => {
    console.log(`[discovery] INFO: ${message}`);
  },
  error: (message: string) => {
    console.error(`[discovery] ERROR: ${message}`);
  },
  warn: (message: string) => {
    console.warn(`[discovery] WARN: ${message}`);
  },
  debug: (message: string) => {
    if (process.env.DEBUG) {
      console.debug(`[discovery] DEBUG: ${message}`);
    }
  }
};

// Helper function to wait/sleep
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to safely parse JSON with error handling
export function safeJsonParse<T>(text: string, defaultValue: T): T {
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    logger.error(`Failed to parse JSON: ${e.message}`);
    return defaultValue;
  }
}

// Create a random delay for scraper requests to avoid rate limiting
export function randomDelay(min = 1000, max = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(delay);
}

// Formats a number with commas for display
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

// Truncate text to a maximum length with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Utility function to calculate intersection between arrays
export function arrayIntersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return [...new Set(a)].filter(x => setB.has(x));
}

// Calculate Jaccard similarity between two arrays
export function jaccardSimilarity<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  const intersection = arrayIntersection(a, b).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

// Calculate weighted score for matching
export function calculateWeightedScore(scores: Record<string, number>, weights: Record<string, number>): number {
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [key, weight] of Object.entries(weights)) {
    if (scores[key] !== undefined) {
      totalScore += scores[key] * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

// Utility to extract clean text from HTML
export function extractTextFromHtml(html: string): string {
  // Basic implementation - in a real app, use a proper HTML parser
  return html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

// Normalize strings for comparison
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

// Create a unique ID with prefix
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}