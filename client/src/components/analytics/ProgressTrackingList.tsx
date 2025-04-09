import React, { useState } from 'react';
import { useProgressTrackings } from '@/hooks/use-analytics';
import { useUserOpportunities } from '@/hooks/use-opportunities';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, Pencil, PlusCircle, ArrowRight } from 'lucide-react';
import { ProgressTracking } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface ProgressTrackingListProps {
  onSelect: (tracking: ProgressTracking) => void;
  onCreateNew: () => void;
}

export function ProgressTrackingList({ onSelect, onCreateNew }: ProgressTrackingListProps) {
  const { data: progressTrackings, isLoading } = useProgressTrackings();
  
  // Function to determine progress color based on status
  const getProgressColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'planning':
        return 'bg-blue-500';
      case 'implementing':
        return 'bg-yellow-500';
      case 'growing':
        return 'bg-green-500';
      case 'scaling':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-teal-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Calculate progress percentage based on stage
  const calculateProgress = (stage: string) => {
    const stages = ['planning', 'implementing', 'growing', 'scaling', 'completed'];
    const stageIndex = stages.findIndex(s => s === stage.toLowerCase());
    return stageIndex >= 0 ? ((stageIndex + 1) / stages.length) * 100 : 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Your Progress Tracking</h3>
          <Button variant="outline" size="sm" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
        
        {[1, 2, 3].map((_, i) => (
          <Card key={i} className="mb-4">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-[250px] mb-2" />
              <Skeleton className="h-3 w-[180px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex justify-between items-center mb-2">
                <Skeleton className="h-3 w-[100px]" />
                <Skeleton className="h-5 w-[70px] rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!progressTrackings || progressTrackings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[300px]">
        <div className="rounded-full bg-muted p-3 mb-4">
          <PlusCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium mb-2">No progress tracking yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start tracking your progress on monetization opportunities to see analytics and insights.
        </p>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Start Tracking an Opportunity
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Progress Tracking</h3>
        <Button onClick={onCreateNew} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>
      
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {progressTrackings.map(tracking => {
            const progressPercent = calculateProgress(tracking.currentStage);
            const progressColorClass = getProgressColor(tracking.currentStage);
            
            return (
              <Card 
                key={tracking.id} 
                className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelect(tracking)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{tracking.opportunityTitle}</CardTitle>
                    <Badge variant="outline">{tracking.opportunityType}</Badge>
                  </div>
                  <CardDescription>
                    Started: {new Date(tracking.startDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Stage:</span>
                      <Badge>{tracking.currentStage}</Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <Progress value={progressPercent} className={progressColorClass} />
                    </div>
                    
                    {tracking.totalRevenue && parseFloat(tracking.totalRevenue.toString()) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Revenue:</span>
                        <span className="font-medium">{formatCurrency(tracking.totalRevenue)}</span>
                      </div>
                    )}
                    
                    {tracking.nextMilestone && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Next Milestone:</span>
                        <span className="font-medium">{tracking.nextMilestone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="pt-0">
                  <Button variant="ghost" size="sm" className="ml-auto">
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}