import React, { useState, useEffect } from "react";

interface LoadingStateProps {
  useEnhanced?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ useEnhanced = false }) => {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Enhanced algorithm has more steps and takes longer
    const maxSteps = useEnhanced ? 6 : 4;
    
    // Significantly slow down the animation timing so users can see each step
    // The backend processes in 1-2 seconds, but we want to show all steps clearly
    // Each step should be visible for at least this amount of time
    const minimumStepVisibilityTime = 4000; // 4 seconds per step minimum
    
    // Total animation should run for at least this amount of time to ensure all steps are seen
    const totalMinimumAnimationTime = useEnhanced ? 24000 : 16000; // 24 seconds for enhanced, 16 for regular
    
    // Calculate timing for each step to ensure both minimum step time and total animation time
    let timings = [];
    for (let i = 0; i < maxSteps; i++) {
      // Distribute the steps more evenly with intentional timing differences:
      // - First step is slightly quicker (80% of standard time)
      // - Middle steps take full time 
      // - Last step is slightly quicker (90% of standard time)
      const stepPosition = i / (maxSteps - 1); // 0 to 1 position in sequence
      const multiplier = 
        i === 0 ? 0.8 :                // First step: 80% of standard time
        i === maxSteps - 1 ? 0.9 :     // Last step: 90% of standard time
        stepPosition < 0.33 ? 1.1 :    // Early steps: 110% of standard time (slow them down)
        stepPosition > 0.66 ? 1.0 :    // Later steps: 100% of standard time
        1.05;                          // Middle steps: 105% of standard time
      
      // Calculate actual step timing, ensuring minimum visibility duration
      const baseStepTime = totalMinimumAnimationTime / maxSteps;
      const adjustedStepTime = baseStepTime * multiplier;
      
      // Each step starts after the cumulative time of all previous steps
      // For first step (i=0), this will be the time when step 1 appears (not zero)
      timings.push(Math.round(adjustedStepTime * (i + 1)));
    }
    
    console.log("Loading animation timings (ms):", timings);
    
    // Create a timeout for each step transition (not the first step which shows immediately)
    const timeouts = timings.map((time, index) => 
      setTimeout(() => {
        console.log(`Transitioning to step ${index + 1} at ${time}ms`);
        setStep(index + 1);
      }, time)
    );
    
    // Track when we started for progress calculation
    const startTime = Date.now();
    
    // Progress speed calculation with improved easing
    const totalDuration = totalMinimumAnimationTime;
    const progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      
      // Enhanced easing function to make progress feel more natural:
      // - Start slightly faster 
      // - Slow down in the middle sections
      // - Speed up slightly at the end
      let percentComplete = Math.min(elapsedTime / totalDuration, 1);
      
      // Apply cubic easing for more natural progress bar movement (ease-in-out)
      // This creates a more gradual acceleration and deceleration curve
      if (percentComplete < 0.5) {
        // First half: ease in (slow to fast)
        percentComplete = 4 * percentComplete * percentComplete * percentComplete;
      } else {
        // Second half: ease out (fast to slow) 
        percentComplete = 1 - Math.pow(-2 * percentComplete + 2, 3) / 2;
      }
      
      const easedProgress = Math.round(percentComplete * 100);
      setProgress(easedProgress);
      
      // Stop updating progress once we reach 100%
      if (easedProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 50);

    return () => {
      // Clean up all timeouts and intervals
      timeouts.forEach(timeout => clearTimeout(timeout));
      clearInterval(progressInterval);
    };
  }, [useEnhanced]);

  // Regular algorithm steps
  const regularSteps = [
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
  
  // Enhanced algorithm steps
  const enhancedSteps = [
    {
      title: "Analyzing your skills and preferences...",
      description: "Claude is assessing your unique skillset and constraints"
    },
    {
      title: "Researching current market opportunities...",
      description: "Searching the web for real-time monetization data"
    },
    {
      title: "Gathering success stories and case studies...",
      description: "Finding examples of people who monetized similar skills"
    },
    {
      title: "Researching market rates and demand...",
      description: "Analyzing platforms for income potential and competition"
    },
    {
      title: "Creating personalized recommendations...",
      description: "Combining AI analysis with web research for custom opportunities"
    },
    {
      title: "Building actionable guides with real resources...",
      description: "Preparing detailed implementation steps with up-to-date resources"
    }
  ];
  
  // Choose the appropriate steps based on the algorithm
  const searchSteps = useEnhanced ? enhancedSteps : regularSteps;

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
        <h3 className="mt-4 text-xl font-semibold text-neutral-800">
          {useEnhanced ? "Enhanced Research in Progress" : "AI Research in Progress"}
        </h3>
        <p className="text-neutral-500 mt-1">
          {useEnhanced 
            ? "Claude is analyzing your skills and searching the web for opportunity matches" 
            : "Claude is analyzing your skills and finding opportunity matches"
          }
        </p>
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
        {useEnhanced 
          ? "This may take up to 25 seconds to thoroughly research the best opportunities with real-time web data" 
          : "This may take up to 20 seconds to thoroughly research the best opportunities for you"
        }
      </div>
    </div>
  );
};

export default LoadingState;
