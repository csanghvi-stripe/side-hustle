import axios from 'axios';
import * as cheerio from 'cheerio';
import { OpportunityType } from '../../client/src/types';

// Interface for search results from various platforms
interface PlatformSearchResult {
  title: string;
  description: string;
  url: string;
  rateRange?: string;
  platform: string;
}

// Interface for success stories found during research
interface SuccessStory {
  name: string;
  background: string;
  journey: string;
  outcome: string;
  source: string;
  sourceUrl: string;
}

// Interface for platform rate data
interface PlatformRateData {
  platform: string;
  averageRate: string;
  rateRange: string;
  demandLevel: 'Low' | 'Medium' | 'High';
  competitionLevel: 'Low' | 'Medium' | 'High';
}

/**
 * Searches for monetization opportunities across multiple platforms based on skills
 * @param skills - Array of user skills to search for
 * @param opportunityType - Type of opportunity to search for
 * @returns Promise with array of platform search results
 */
export async function searchOpportunities(
  skills: string[], 
  opportunityType: OpportunityType
): Promise<PlatformSearchResult[]> {
  const results: PlatformSearchResult[] = [];
  
  try {
    // Dynamically determine which platforms to search based on opportunity type
    const platforms = getPlatformsForOpportunityType(opportunityType);
    
    // Execute searches in parallel for each skill across relevant platforms
    const searchPromises = skills.flatMap(skill => 
      platforms.map(platform => searchPlatform(skill, platform, opportunityType))
    );
    
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Process successful results
    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        results.push(...result.value);
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error searching for opportunities:', error);
    return [];
  }
}

/**
 * Determines which platforms to search based on opportunity type
 */
function getPlatformsForOpportunityType(opportunityType: OpportunityType): string[] {
  switch (opportunityType) {
    case OpportunityType.FREELANCE:
      return ['upwork', 'fiverr', 'freelancer', 'peopleperhour'];
    case OpportunityType.DIGITAL_PRODUCT:
      return ['gumroad', 'etsy', 'shopify', 'creativemarket'];
    case OpportunityType.CONTENT:
      return ['youtube', 'medium', 'substack', 'patreon'];
    case OpportunityType.SERVICE:
      return ['thumbtack', 'taskrabbit', 'care.com', 'angieslist'];
    default:
      return ['upwork', 'fiverr', 'gumroad', 'etsy', 'youtube'];
  }
}

/**
 * Searches a specific platform for opportunities related to a skill
 */
async function searchPlatform(
  skill: string, 
  platform: string,
  opportunityType: OpportunityType
): Promise<PlatformSearchResult[]> {
  try {
    const results: PlatformSearchResult[] = [];
    
    // Implement different search strategies based on the platform
    // For demonstration, we'll use a mock implementation
    // In a production environment, replace with actual API calls or web scraping
    
    // Simulate API calls or web scraping results
    const searchUrl = getSearchUrlForPlatform(platform, skill);
    
    // Perform an HTTP request to the search URL
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }).catch(err => {
      console.log(`Error searching ${platform} for ${skill}: ${err.message}`);
      return null;
    });
    
    if (response && response.data) {
      // Parse results based on platform
      const parsedResults = parsePlatformResults(platform, response.data, skill);
      results.push(...parsedResults);
    }
    
    return results;
  } catch (error) {
    console.error(`Error searching ${platform} for ${skill}:`, error);
    return [];
  }
}

/**
 * Gets the search URL for a specific platform and skill
 */
function getSearchUrlForPlatform(platform: string, skill: string): string {
  const encodedSkill = encodeURIComponent(skill);
  
  switch (platform.toLowerCase()) {
    case 'upwork':
      return `https://www.upwork.com/search/jobs/?q=${encodedSkill}`;
    case 'fiverr':
      return `https://www.fiverr.com/search/gigs?query=${encodedSkill}`;
    case 'freelancer':
      return `https://www.freelancer.com/jobs/1/?keyword=${encodedSkill}`;
    case 'gumroad':
      return `https://app.gumroad.com/discover?query=${encodedSkill}`;
    case 'etsy':
      return `https://www.etsy.com/search?q=${encodedSkill}`;
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encodedSkill}+monetize`;
    case 'medium':
      return `https://medium.com/search?q=${encodedSkill}`;
    case 'substack':
      return `https://substack.com/search?q=${encodedSkill}`;
    case 'patreon':
      return `https://www.patreon.com/search?q=${encodedSkill}`;
    default:
      return `https://www.google.com/search?q=${encodedSkill}+${platform}+monetize`;
  }
}

/**
 * Parses search results based on the platform
 */
function parsePlatformResults(platform: string, html: string, skill: string): PlatformSearchResult[] {
  const results: PlatformSearchResult[] = [];
  
  try {
    const $ = cheerio.load(html);
    
    switch (platform.toLowerCase()) {
      case 'upwork':
        // Upwork job listings
        $('.job-tile').each((i, el) => {
          if (i >= 5) return; // Limit to 5 results
          
          const title = $(el).find('.job-title').text().trim();
          const description = $(el).find('.job-description').text().trim();
          const urlPath = $(el).find('a.job-title-link').attr('href') || '';
          const url = urlPath.startsWith('/') ? `https://www.upwork.com${urlPath}` : urlPath;
          const rateRange = $(el).find('.job-price').text().trim();
          
          results.push({
            title,
            description,
            url,
            rateRange,
            platform: 'Upwork'
          });
        });
        break;
        
      case 'fiverr':
        // Fiverr gig listings
        $('.gig-card-layout').each((i, el) => {
          if (i >= 5) return;
          
          const title = $(el).find('.content-title').text().trim();
          const description = $(el).find('.gig-card-description').text().trim();
          const urlPath = $(el).find('a.gig-link').attr('href') || '';
          const url = urlPath.startsWith('/') ? `https://www.fiverr.com${urlPath}` : urlPath;
          const rateRange = $(el).find('.price').text().trim();
          
          results.push({
            title,
            description,
            url,
            rateRange,
            platform: 'Fiverr'
          });
        });
        break;
        
      case 'youtube':
        // YouTube videos
        $('ytd-video-renderer').each((i, el) => {
          if (i >= 5) return;
          
          const title = $(el).find('#video-title').text().trim();
          const description = $(el).find('#description-text').text().trim();
          const urlPath = $(el).find('#video-title').attr('href') || '';
          const url = urlPath.startsWith('/') ? `https://www.youtube.com${urlPath}` : urlPath;
          
          results.push({
            title,
            description,
            url,
            platform: 'YouTube'
          });
        });
        break;
        
      // Add more platform parsers as needed
      
      default:
        // Default parser for other platforms
        // Look for common patterns like titles, links, and descriptions
        $('h2, h3').each((i, el) => {
          if (i >= 5) return;
          
          const titleEl = $(el);
          const title = titleEl.text().trim();
          
          // Only include results that are relevant to the skill
          if (!title.toLowerCase().includes(skill.toLowerCase())) return;
          
          const linkEl = titleEl.find('a') || titleEl.closest('a');
          const url = linkEl.attr('href') || '';
          const description = titleEl.next('p').text().trim() || '';
          
          results.push({
            title,
            description,
            url,
            platform
          });
        });
        break;
    }
  } catch (error) {
    console.error(`Error parsing ${platform} results:`, error);
  }
  
  return results;
}

/**
 * Searches for success stories related to monetizing specific skills
 * @param skills - Array of user skills to search for success stories
 * @param opportunityType - Type of opportunity to focus on
 * @returns Promise with array of success stories
 */
export async function searchSuccessStories(
  skills: string[], 
  opportunityType: OpportunityType
): Promise<SuccessStory[]> {
  const stories: SuccessStory[] = [];
  
  try {
    // Search various sources for success stories
    const sources = [
      'reddit.com/r/freelance',
      'reddit.com/r/entrepreneur',
      'indiehackers.com',
      'medium.com',
      'quora.com'
    ];
    
    const searchPromises = skills.flatMap(skill => 
      sources.map(source => searchSource(skill, source, opportunityType))
    );
    
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Process successful results
    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        stories.push(...result.value);
      }
    });
    
    return stories;
  } catch (error) {
    console.error('Error searching for success stories:', error);
    return [];
  }
}

/**
 * Searches a specific source for success stories related to a skill
 */
async function searchSource(
  skill: string,
  source: string,
  opportunityType: OpportunityType
): Promise<SuccessStory[]> {
  try {
    const stories: SuccessStory[] = [];
    const type = opportunityType.toLowerCase().replace(/_/g, '+');
    const searchUrl = `https://www.google.com/search?q=site:${source}+${encodeURIComponent(skill)}+success+story+${type}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }).catch(err => {
      console.log(`Error searching ${source} for ${skill} success stories: ${err.message}`);
      return null;
    });
    
    if (response && response.data) {
      const $ = cheerio.load(response.data);
      
      // Extract Google search results
      $('.g').each((i, el) => {
        if (i >= 3) return; // Limit to 3 results per source
        
        const title = $(el).find('h3').text().trim();
        const url = $(el).find('a').attr('href') || '';
        const snippet = $(el).find('.VwiC3b').text().trim();
        
        // Only include results that look like success stories
        if (!title.toLowerCase().includes('success') && !snippet.toLowerCase().includes('success')) return;
        
        // Extract a name from the title or snippet
        const nameMatch = (title + ' ' + snippet).match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
        const name = nameMatch ? nameMatch[1] : 'Successful Professional';
        
        stories.push({
          name,
          background: `Professional with expertise in ${skill}`,
          journey: snippet.slice(0, 100) + '...',
          outcome: 'Successfully monetized their skills through ' + opportunityType,
          source: source.replace(/\.com.*$/, '.com'),
          sourceUrl: url
        });
      });
    }
    
    return stories;
  } catch (error) {
    console.error(`Error searching ${source} for ${skill} success stories:`, error);
    return [];
  }
}

/**
 * Researches current market rates for specific skills across platforms
 * @param skills - Array of user skills to research
 * @param opportunityType - Type of opportunity to focus on
 * @returns Promise with rate data for each skill
 */
export async function researchMarketRates(
  skills: string[],
  opportunityType: OpportunityType
): Promise<Record<string, PlatformRateData[]>> {
  const rateData: Record<string, PlatformRateData[]> = {};
  
  try {
    // For each skill, research rates across relevant platforms
    for (const skill of skills) {
      rateData[skill] = await researchRatesForSkill(skill, opportunityType);
    }
    
    return rateData;
  } catch (error) {
    console.error('Error researching market rates:', error);
    return {};
  }
}

/**
 * Researches market rates for a specific skill
 */
async function researchRatesForSkill(
  skill: string,
  opportunityType: OpportunityType
): Promise<PlatformRateData[]> {
  const platforms = getPlatformsForOpportunityType(opportunityType);
  const rateData: PlatformRateData[] = [];
  
  try {
    // Research each relevant platform
    for (const platform of platforms) {
      const platformData = await researchPlatformRates(skill, platform);
      if (platformData) {
        rateData.push(platformData);
      }
    }
    
    return rateData;
  } catch (error) {
    console.error(`Error researching rates for ${skill}:`, error);
    return [];
  }
}

/**
 * Researches rates for a specific skill on a platform
 */
async function researchPlatformRates(
  skill: string,
  platform: string
): Promise<PlatformRateData | null> {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(skill)}+rates+on+${platform}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }).catch(err => {
      console.log(`Error researching ${platform} rates for ${skill}: ${err.message}`);
      return null;
    });
    
    if (response && response.data) {
      // Parse the rate information from the response
      // This would require more sophisticated parsing in a production environment
      // For now, return placeholder data
      
      return {
        platform,
        averageRate: '$50-100/hr',
        rateRange: '$25-200/hr',
        demandLevel: 'Medium',
        competitionLevel: 'Medium'
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error researching ${platform} rates for ${skill}:`, error);
    return null;
  }
}