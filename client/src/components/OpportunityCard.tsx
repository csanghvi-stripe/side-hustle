import React, { useState } from "react";
import { MonetizationOpportunity, OpportunityType, RiskLevel, RiskLevelObject } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OpportunityCardProps {
  opportunity: MonetizationOpportunity;
}

const typeVariants = {
  [OpportunityType.FREELANCE]: "service",
  [OpportunityType.DIGITAL_PRODUCT]: "passive",
  [OpportunityType.CONTENT]: "info",
  [OpportunityType.SERVICE]: "service",
  [OpportunityType.PASSIVE]: "passive",
  [OpportunityType.INFO_PRODUCT]: "info",
};

const riskLevelColors = {
  [RiskLevel.LOW]: "bg-green-500",
  [RiskLevel.MEDIUM]: "bg-amber-500",
  [RiskLevel.HIGH]: "bg-red-500",
};

const getIconForType = (type: OpportunityType) => {
  switch (type) {
    case OpportunityType.FREELANCE:
      return (
        <svg
          className="w-5 h-5 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case OpportunityType.DIGITAL_PRODUCT:
      return (
        <svg
          className="w-5 h-5 text-green-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      );
    case OpportunityType.CONTENT:
    case OpportunityType.INFO_PRODUCT:
      return (
        <svg
          className="w-5 h-5 text-amber-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      );
    case OpportunityType.SERVICE:
      return (
        <svg
          className="w-5 h-5 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case OpportunityType.PASSIVE:
      return (
        <svg
          className="w-5 h-5 text-green-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16 12h-6" />
          <path d="M10 16V8" />
        </svg>
      );
    default:
      return (
        <svg
          className="w-5 h-5 text-gray-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
};

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="result-card border border-neutral-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
      <div className="bg-neutral-50 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          {getIconForType(opportunity.type)}
          <h3 className="font-medium ml-2">{opportunity.title}</h3>
        </div>
        <div className="flex items-center">
          <Badge variant={typeVariants[opportunity.type] as any} className="mr-2">
            {opportunity.type}
          </Badge>
          <button 
            onClick={toggleExpanded} 
            className="text-neutral-400 hover:text-neutral-700"
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
          >
            <svg
              className={cn("w-5 h-5", isExpanded ? "rotate-180" : "")}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 py-3 border-t border-neutral-100">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-neutral-500">Income Potential</p>
              <p className="font-medium">{opportunity.incomePotential}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Startup Cost</p>
              <p className="font-medium">{opportunity.startupCost}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Risk Level</p>
              <p className="font-medium flex items-center">
                <span className={cn("inline-block w-2 h-2 rounded-full mr-1", 
                  typeof opportunity.riskLevel === 'string' 
                    ? riskLevelColors[opportunity.riskLevel as RiskLevel] 
                    : riskLevelColors[RiskLevel.MEDIUM]
                )}></span>
                {typeof opportunity.riskLevel === 'string'
                  ? opportunity.riskLevel
                  : (opportunity.riskLevel as RiskLevelObject)?.high ? 'High' : (opportunity.riskLevel as RiskLevelObject)?.medium ? 'Medium' : 'Low'}
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-base mb-2">How It Works</h4>
            <p className="text-sm">{opportunity.description}</p>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-base mb-2">Steps to Start</h4>
            <ol className="text-sm list-decimal list-outside ml-5 space-y-2">
              {opportunity.stepsToStart.map((step, index) => (
                <li key={index} className="pl-1">{step}</li>
              ))}
            </ol>
          </div>
          
          {opportunity.successStories && opportunity.successStories.length > 0 && (
            <div className="mb-8">
              <h4 className="font-medium text-base mb-3 border-b pb-2">Success Stories</h4>
              <div className="space-y-6">
                {opportunity.successStories.map((story, index) => (
                  <div key={index} className="p-4 border border-primary/10 bg-gradient-to-br from-white to-primary/5 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-lg flex-shrink-0 font-semibold">
                        {story?.name ? story.name.charAt(0) : ''}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-semibold">{story?.name || 'Anonymous User'}</h5>
                          {story?.profileUrl && (
                            <a 
                              href={story.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition"
                            >
                              View Profile
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">{story?.background || 'Professional with experience in this field'}</p>
                        
                        <div className="mt-3 relative pl-5 border-l-2 border-primary/30">
                          <h6 className="text-sm font-medium mb-1">The Journey:</h6>
                          <p className="text-sm text-neutral-700">{story?.journey || 'Started with small projects and gradually built up their portfolio and client base.'}</p>
                        </div>
                        
                        <div className="mt-3 bg-primary/10 p-3 rounded-md">
                          <h6 className="text-sm font-medium mb-1 flex items-center">
                            <svg className="w-4 h-4 mr-1 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Current Status:
                          </h6>
                          <p className="text-sm font-medium text-primary">{story?.outcome || 'Successfully monetized their skills through this approach.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <h4 className="font-medium text-base mb-2 border-b pb-2">Resources & Examples</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {opportunity.resources.map((resource, index) => (
                <a 
                  key={index}
                  href={resource?.url || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center p-3 text-sm font-medium rounded border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300 transition-colors"
                >
                  {resource?.source === "Reddit" ? (
                    <svg className="w-4 h-4 mr-2 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                      <circle cx="12" cy="12" r="3" fill="white"/>
                      <circle cx="17" cy="9" r="1.5" fill="white"/>
                      <circle cx="7" cy="9" r="1.5" fill="white"/>
                      <path fill="white" d="M17 14c-1 1.5-2.5 3-5 3s-4-1.5-5-3"/>
                    </svg>
                  ) : resource?.source === "YouTube" ? (
                    <svg className="w-4 h-4 mr-2 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  ) : resource?.source === "Fiverr" ? (
                    <svg className="w-4 h-4 mr-2 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23 9V7h-6.5C15.67 7 15 7.67 15 8.5V11h-3V7H9v9h3v-3h3v4.5c0 .83.67 1.5 1.5 1.5H23v-2h-5v-5h5V9Z"/>
                    </svg>
                  ) : resource?.source === "Gumroad" ? (
                    <svg className="w-4 h-4 mr-2 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.5 9A5.5 5.5 0 0 1 14 3.5H21v17H3V9h5.5z"/>
                    </svg>
                  ) : resource?.source === "LinkedIn" ? (
                    <svg className="w-4 h-4 mr-2 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  ) : resource?.source === "Medium" ? (
                    <svg className="w-4 h-4 mr-2 text-neutral-800" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 mr-2 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                  <div>
                    <div className="font-medium line-clamp-1">{resource?.title || 'Resource'}</div>
                    <div className="text-xs text-neutral-500">{resource?.source || 'Web'}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <h4 className="flex items-center font-medium text-sm text-primary mb-2">
              <svg
                className="w-4 h-4 mr-1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
                <polyline points="7.5 19.79 7.5 14.6 3 12" />
                <polyline points="21 12 16.5 14.6 16.5 19.79" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              Pro Tips For Success
            </h4>
            <ul className="text-xs space-y-1 text-neutral-700">
              <li>• Start with small projects to build a portfolio and reviews quickly</li>
              <li>• Focus on high-engagement communities where potential clients gather</li>
              <li>• Set up payment processing before advertising your services</li>
              <li>• Clearly define your scope of work to avoid scope creep</li>
              <li>• Consistency is key - make steady progress each week</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityCard;
