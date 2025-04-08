import React from "react";

const LoadingState: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 border border-neutral-100 text-center">
      <div className="animate-spin mx-auto w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="mt-4 text-lg font-medium text-neutral-700">Analyzing opportunities...</p>
      <p className="mt-2 text-neutral-500">Searching for real examples and resources</p>
    </div>
  );
};

export default LoadingState;
