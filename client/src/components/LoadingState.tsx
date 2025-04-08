import React, { useState, useEffect } from "react";

const LoadingState: React.FC = () => {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const maxSteps = 4;
    const interval = setInterval(() => {
      setStep(current => current < maxSteps ? current + 1 : 1);
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress(current => {
        const newProgress = current + 1;
        return newProgress > 100 ? 100 : newProgress;
      });
    }, 600);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, []);

  const searchSteps = [
    {
      title: "Analyzing your skills and preferences...",
      description: "Claude is assessing your unique skillset and constraints"
    },
    {
      title: "Evaluating market opportunities...",
      description: "Identifying monetization options that match your profile"
    },
    {
      title: "Creating personalized recommendations...",
      description: "Generating custom opportunities with detailed information"
    },
    {
      title: "Building actionable guides...",
      description: "Preparing step-by-step instructions for immediate implementation"
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 border border-neutral-100">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
        <h3 className="mt-4 text-xl font-semibold text-neutral-800">AI Research in Progress</h3>
        <p className="text-neutral-500 mt-1">Claude is analyzing your skills and finding opportunity matches</p>
      </div>

      <div className="mt-8 space-y-6">
        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="space-y-4">
          {searchSteps.map((searchStep, index) => (
            <div 
              key={index} 
              className={`flex items-start p-3 rounded-lg border ${
                step === index + 1 
                  ? 'border-primary/30 bg-primary/5' 
                  : step > index + 1 
                    ? 'border-green-100 bg-green-50' 
                    : 'border-neutral-100 bg-white'
              }`}
            >
              {step > index + 1 ? (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-3 flex-shrink-0">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              ) : step === index + 1 ? (
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mr-3 flex-shrink-0"></div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-neutral-200 flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-xs text-neutral-400">{index + 1}</span>
                </div>
              )}
              <div>
                <p className={`font-medium ${step === index + 1 ? 'text-primary' : step > index + 1 ? 'text-green-700' : 'text-neutral-500'}`}>
                  {searchStep.title}
                </p>
                <p className="text-xs text-neutral-500 mt-1">{searchStep.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-neutral-500">
        This may take 30-60 seconds to thoroughly research the best opportunities for you
      </div>
    </div>
  );
};

export default LoadingState;
