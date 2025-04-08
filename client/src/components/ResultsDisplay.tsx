import React, { useState } from "react";
import { MonetizationResults, OpportunityType } from "@/types";
import OpportunityCard from "./OpportunityCard";
import UserMatchCard from "./UserMatchCard";

interface ResultsDisplayProps {
  results: MonetizationResults;
  onReset: () => void;
}

type TabKey = "all" | OpportunityType.FREELANCE | OpportunityType.DIGITAL_PRODUCT | OpportunityType.CONTENT | OpportunityType.SERVICE;

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, onReset }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filteredOpportunities = activeTab === "all" 
    ? results.opportunities 
    : results.opportunities.filter(opp => opp.type === activeTab);

  const skillsList = results.userProfile.skills.join(", ");

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-100">
      {/* Results Header */}
      <div className="bg-primary text-white px-6 py-4">
        <h2 className="text-xl font-medium">Your Monetization Opportunities</h2>
        <p className="text-primary-50">Based on your skills in {skillsList}</p>
      </div>
      
      {/* Results Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex -mb-px overflow-x-auto py-2 px-6">
          <button 
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm mr-8 ${
              activeTab === "all" 
                ? "text-primary border-primary" 
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab("all")}
          >
            All Opportunities
          </button>
          <button 
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm mr-8 ${
              activeTab === OpportunityType.FREELANCE 
                ? "text-primary border-primary" 
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab(OpportunityType.FREELANCE)}
          >
            Freelance
          </button>
          <button 
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm mr-8 ${
              activeTab === OpportunityType.DIGITAL_PRODUCT 
                ? "text-primary border-primary" 
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab(OpportunityType.DIGITAL_PRODUCT)}
          >
            Digital Products
          </button>
          <button 
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm mr-8 ${
              activeTab === OpportunityType.CONTENT 
                ? "text-primary border-primary" 
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab(OpportunityType.CONTENT)}
          >
            Content Creation
          </button>
          <button 
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === OpportunityType.SERVICE 
                ? "text-primary border-primary" 
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab(OpportunityType.SERVICE)}
          >
            Services
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="p-6 space-y-6">
        {filteredOpportunities.length > 0 ? (
          filteredOpportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))
        ) : (
          <div className="p-4 text-center text-neutral-500">
            <svg
              className="mx-auto h-12 w-12 text-neutral-300"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="mt-2">No {activeTab} opportunities found matching your criteria.</p>
          </div>
        )}

        <div className="flex justify-center mt-8">
          <button
            onClick={onReset}
            className="inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md shadow-sm text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <svg
              className="mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 2v6h6M21.5 22v-6h-6" />
              <path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2" />
            </svg>
            Start New Search
          </button>
        </div>
        
        {/* Similar Users Section */}
        {results.similarUsers && results.similarUsers.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h3 className="text-lg font-medium text-neutral-900 mb-4">Connect with Similar Professionals</h3>
            <p className="text-neutral-600 text-sm mb-6">
              We found people with similar skills who might be on the same monetization journey as you.
              Connect with them to share experiences and opportunities!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.similarUsers.map((match, index) => (
                <UserMatchCard key={index} match={match} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;
