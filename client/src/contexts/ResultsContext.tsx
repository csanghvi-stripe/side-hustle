import React, { createContext, useState, useContext, ReactNode } from 'react';
import { MonetizationResults } from '@/types';

type SourceType = 'search' | 'saved' | 'inspire' | 'home' | null;

interface ResultsContextType {
  results: MonetizationResults | null;
  source: SourceType;
  setResults: (results: MonetizationResults) => void;
  setSource: (source: SourceType) => void;
  clearResults: () => void;
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResultsState] = useState<MonetizationResults | null>(null);
  const [source, setSourceState] = useState<SourceType>(null);

  const setResults = (newResults: MonetizationResults) => {
    setResultsState(newResults);
  };

  const setSource = (newSource: SourceType) => {
    setSourceState(newSource);
  };

  const clearResults = () => {
    setResultsState(null);
    setSourceState(null);
  };

  return (
    <ResultsContext.Provider
      value={{
        results,
        source,
        setResults,
        setSource,
        clearResults,
      }}
    >
      {children}
    </ResultsContext.Provider>
  );
}

export function useResults() {
  const context = useContext(ResultsContext);
  if (context === undefined) {
    throw new Error('useResults must be used within a ResultsProvider');
  }
  return context;
}