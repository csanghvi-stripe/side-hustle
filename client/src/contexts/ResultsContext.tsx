import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { MonetizationResults } from '@/types';

// Define the context state type
type SourceType = 'search' | 'saved' | 'inspire' | 'home' | null;

interface ResultsContextType {
  results: MonetizationResults | null;
  source: SourceType;
  setResults: (results: MonetizationResults) => void;
  setSource: (source: SourceType) => void;
  clearResults: () => void;
}

// Create the context with default values
const ResultsContext = createContext<ResultsContextType | null>(null);

// Provider component
export function ResultsProvider({ children }: { children: ReactNode }) {
  // Initialize state, try to load from localStorage
  const [results, setResultsState] = useState<MonetizationResults | null>(() => {
    if (typeof window !== 'undefined') {
      const storedResults = localStorage.getItem('monetizationResults');
      return storedResults ? JSON.parse(storedResults) : null;
    }
    return null;
  });
  
  const [source, setSourceState] = useState<SourceType>(() => {
    if (typeof window !== 'undefined') {
      const storedSource = localStorage.getItem('opportunitySource');
      return (storedSource as SourceType) || null;
    }
    return null;
  });

  // Update localStorage when results change
  useEffect(() => {
    if (results) {
      localStorage.setItem('monetizationResults', JSON.stringify(results));
    }
  }, [results]);

  // Update localStorage when source changes
  useEffect(() => {
    if (source) {
      localStorage.setItem('opportunitySource', source);
    }
  }, [source]);

  // Custom setters that update both state and localStorage
  const setResults = (newResults: MonetizationResults) => {
    setResultsState(newResults);
  };

  const setSource = (newSource: SourceType) => {
    setSourceState(newSource);
  };

  const clearResults = () => {
    setResultsState(null);
    localStorage.removeItem('monetizationResults');
  };

  // Create the context value object
  const contextValue: ResultsContextType = {
    results,
    source,
    setResults,
    setSource,
    clearResults,
  };

  return (
    <ResultsContext.Provider value={contextValue}>
      {children}
    </ResultsContext.Provider>
  );
}

// Custom hook for using the context
export function useResults() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error('useResults must be used within a ResultsProvider');
  }
  return context;
}