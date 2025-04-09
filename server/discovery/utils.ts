/**
 * Utility functions for the discovery engine
 */

/**
 * Simple logger for the discovery engine
 */
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
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[discovery] DEBUG: ${message}`);
    }
  }
};

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Parse time availability string into hours per week
 */
export function parseTimeAvailability(timeStr: string): number {
  // Handle common formats like "10 hours/week", "2 hours per day", etc.
  const hours = timeStr.match(/(\d+)\s*hours?/i);
  const days = timeStr.match(/(\d+)\s*days?/i);
  
  if (hours) {
    const hoursNum = parseInt(hours[1], 10);
    
    if (timeStr.includes('day')) {
      return hoursNum * 7; // hours per day -> per week
    } else if (timeStr.includes('month')) {
      return hoursNum / 4.3; // hours per month -> per week (approximate)
    } else {
      return hoursNum; // already hours per week
    }
  }
  
  if (days) {
    const daysNum = parseInt(days[1], 10);
    return daysNum * 8; // assume 8 hours per day
  }
  
  // If no clear pattern, make a reasonable guess
  if (timeStr.includes('weekend')) return 16; // weekend -> 16 hours
  if (timeStr.includes('part-time')) return 20; // part-time -> 20 hours
  if (timeStr.includes('full-time')) return 40; // full-time -> 40 hours
  
  // Default fallback
  return 10; // default assumption: 10 hours/week
}

/**
 * Calculate a readability score for text (simplified Flesch-Kincaid)
 * Higher score = more readable (max 100)
 */
export function calculateReadability(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).length;
  const syllables = countSyllables(text);
  
  if (words === 0 || sentences === 0) return 0;
  
  // Simplified Flesch Reading Ease formula
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Rough approximation of syllable count (English only)
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;
  
  for (const word of words) {
    if (word.length <= 3) {
      count += 1;
      continue;
    }
    
    // Count vowel groups as syllables
    const vowelGroups = word.match(/[aeiouy]+/g);
    if (!vowelGroups) {
      count += 1;
      continue;
    }
    
    // Adjust for common patterns
    let syllables = vowelGroups.length;
    
    // Subtract for silent 'e' at end
    if (word.endsWith('e') && syllables > 1) {
      syllables -= 1;
    }
    
    // Add at least one syllable per word
    count += Math.max(1, syllables);
  }
  
  return count;
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Remove common stop words
  const stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of',
    'this', 'that', 'these', 'those', 'it', 'its', 'from', 'be', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'can', 'could', 'may', 'might', 'must', 'ought'
  ];
  
  // Normalize text, remove punctuation
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words
  const words = normalized.split(/\s+/);
  
  // Count word frequency
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    if (word.length < 3 || stopWords.includes(word)) continue;
    
    const count = wordCounts.get(word) || 0;
    wordCounts.set(word, count + 1);
  }
  
  // Sort by frequency
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(entry => entry[0]);
}

/**
 * Calculate similarity between two skill arrays
 * Returns a number between 0 and 1
 */
export function calculateSkillSimilarity(skills1: string[], skills2: string[]): number {
  if (skills1.length === 0 || skills2.length === 0) return 0;
  
  const normalized1 = skills1.map(s => s.toLowerCase());
  const normalized2 = skills2.map(s => s.toLowerCase());
  
  // Count exact matches
  let exactMatches = 0;
  for (const skill of normalized1) {
    if (normalized2.includes(skill)) {
      exactMatches++;
    }
  }
  
  // Count partial matches
  let partialMatches = 0;
  for (const skill1 of normalized1) {
    for (const skill2 of normalized2) {
      if (skill1 === skill2) continue; // Skip exact matches we already counted
      
      if (skill1.includes(skill2) || skill2.includes(skill1)) {
        partialMatches++;
        break;
      }
    }
  }
  
  // Calculate similarity score
  const exactMatchWeight = 0.8;
  const partialMatchWeight = 0.2;
  
  const exactScore = exactMatches / Math.min(normalized1.length, normalized2.length);
  const partialScore = partialMatches / Math.min(normalized1.length, normalized2.length);
  
  return (exactScore * exactMatchWeight) + (partialScore * partialMatchWeight);
}