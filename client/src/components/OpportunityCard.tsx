import React, { useState } from "react";
import { MonetizationOpportunity, OpportunityType, RiskLevel } from "@/types";
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
                <span className={cn("inline-block w-2 h-2 rounded-full mr-1", riskLevelColors[opportunity.riskLevel])}></span>
                {opportunity.riskLevel}
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">How It Works</h4>
            <p className="text-sm">{opportunity.description}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">Steps to Start</h4>
            <ol className="text-sm list-decimal list-inside space-y-1">
              {opportunity.stepsToStart.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">Resources</h4>
            <div className="flex flex-wrap gap-2">
              {opportunity.resources.map((resource, index) => (
                <a 
                  key={index}
                  href={resource.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                >
                  <svg
                    className="w-3 h-3 mr-1"
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
                  {resource.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityCard;
