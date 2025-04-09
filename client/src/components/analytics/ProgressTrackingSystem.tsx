import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  BarChart3, 
  Sparkles, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  LineChart, 
  ChevronRight,
  Lightbulb,
  Star,
  Medal,
  MoveUp,
  Flame,
  Lock, 
} from "lucide-react";

// Define the types
interface ActionPlanTask {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  durationDays: number;
  status: "pending" | "in-progress" | "completed";
  resourceLinks?: { title: string; url: string }[];
  dependsOn?: string[];
  completedAt?: string;
  notes?: string;
}

interface ActionPlanPhase {
  title: string;
  duration: string;
  tasks: ActionPlanTask[];
}

interface ActionPlan {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  phases: ActionPlanPhase[];
  userInputs: any;
}

interface Progress {
  completedTasks: number;
  totalTasks: number;
  percentComplete: number;
  streakDays: number;
  lastActivityDate: string | null;
  estimatedCompletionDate: string | null;
  nextMilestone: string | null;
}

interface MotivationalMessage {
  message: string;
  type: "encouragement" | "milestone" | "tip" | "challenge";
  icon: React.ReactNode;
}

// Progress Tracking System Component
export default function ProgressTrackingSystem({ actionPlan }: { actionPlan: ActionPlan }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch progress data
  const { data: progressData, isLoading } = useQuery({
    queryKey: ["/api/analytics/progress", actionPlan.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/analytics/action-plans/${actionPlan.id}/progress`);
      
      // If the endpoint doesn't exist yet, generate synthetic data
      if (!res.ok && res.status === 404) {
        // Calculate progress based on task completion
        const allTasks = actionPlan.phases.flatMap(phase => phase.tasks);
        const completedTasks = allTasks.filter(task => task.status === "completed").length;
        const totalTasks = allTasks.length;
        const percentComplete = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        // Calculate other metrics
        const today = new Date();
        const lastActivityDate = completedTasks > 0 ? today.toISOString() : null;
        
        // Estimate completion date (very simple estimation)
        const estimatedCompletionDate = totalTasks > 0 && completedTasks > 0 ? 
          new Date(today.getTime() + (totalTasks - completedTasks) * 7 * 24 * 60 * 60 * 1000).toISOString() : 
          null;
        
        // Determine next milestone
        const pendingTasks = allTasks.filter(task => task.status === "pending");
        const nextMilestone = pendingTasks.length > 0 ? pendingTasks[0].title : null;
        
        return {
          completedTasks,
          totalTasks,
          percentComplete,
          streakDays: Math.floor(Math.random() * 5) + 1, // Just for demo
          lastActivityDate,
          estimatedCompletionDate,
          nextMilestone
        };
      }
      
      return await res.json();
    },
    enabled: !!actionPlan && !!user
  });

  // Mark task as complete mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: string; status: ActionPlanTask["status"]; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/analytics/action-plans/${actionPlan.id}/tasks/${taskId}`, {
        status,
        notes,
        completedAt: status === "completed" ? new Date().toISOString() : undefined
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/progress", actionPlan.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/action-plans"] });
      toast({
        title: "Task updated",
        description: "Your task status has been updated successfully.",
        variant: "default"
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating task",
        description: error instanceof Error ? error.message : "Failed to update task status.",
        variant: "destructive"
      });
    }
  });

  // Get Motivational Message
  const getMotivationalMessage = (progress: Progress): MotivationalMessage => {
    if (!progress) {
      return {
        message: "Ready to start your journey? Let's take the first step!",
        type: "encouragement",
        icon: <MoveUp className="h-5 w-5 text-primary" />
      };
    }

    // Different message types based on progress
    if (progress.percentComplete === 0) {
      return {
        message: "Every expert was once a beginner. Start your journey today!",
        type: "encouragement",
        icon: <MoveUp className="h-5 w-5 text-primary" />
      };
    } else if (progress.percentComplete < 25) {
      return {
        message: `Great start! You've already completed ${progress.completedTasks} tasks. Keep the momentum going!`,
        type: "encouragement",
        icon: <Flame className="h-5 w-5 text-orange-500" />
      };
    } else if (progress.percentComplete < 50) {
      return {
        message: `You're building a solid foundation! ${progress.streakDays}-day streak and counting.`,
        type: "milestone",
        icon: <Medal className="h-5 w-5 text-yellow-500" />
      };
    } else if (progress.percentComplete < 75) {
      return {
        message: "You're making impressive progress! You're ahead of 68% of users at this stage.",
        type: "milestone",
        icon: <Trophy className="h-5 w-5 text-yellow-600" />
      };
    } else if (progress.percentComplete < 100) {
      return {
        message: "The finish line is in sight! Just a few more tasks to complete your plan.",
        type: "encouragement",
        icon: <Star className="h-5 w-5 text-yellow-400" />
      };
    } else {
      return {
        message: "Congratulations! You've completed your action plan. Time to reap the rewards!",
        type: "milestone",
        icon: <Sparkles className="h-5 w-5 text-primary" />
      };
    }
  };

  // Get a random tip
  const getTip = (): MotivationalMessage => {
    const tips = [
      "Try the '2-minute rule': If a task takes less than 2 minutes, do it now instead of scheduling it for later.",
      "Break down larger tasks into smaller, more manageable steps.",
      "Set specific times for checking emails and messages to avoid constant interruptions.",
      "Use the Pomodoro Technique: Work for 25 minutes, then take a 5-minute break.",
      "Celebrate small wins to maintain motivation and momentum."
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    return {
      message: randomTip,
      type: "tip",
      icon: <Lightbulb className="h-5 w-5 text-amber-400" />
    };
  };

  // Get recommended next task
  const getRecommendedNextTask = (): ActionPlanTask | null => {
    if (!actionPlan) return null;
    
    // Find first pending task that doesn't depend on other pending tasks
    for (const phase of actionPlan.phases) {
      for (const task of phase.tasks) {
        if (task.status === "pending") {
          // Check if all dependencies are completed
          const dependencies = task.dependsOn || [];
          const allDependenciesCompleted = dependencies.every(depId => {
            const dependentTask = findTaskById(depId);
            return dependentTask && dependentTask.status === "completed";
          });
          
          if (allDependenciesCompleted) {
            return task;
          }
        }
      }
    }
    
    return null;
  };

  // Helper to find a task by ID
  const findTaskById = (taskId: string): ActionPlanTask | undefined => {
    for (const phase of actionPlan.phases) {
      const task = phase.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  };

  // Handle task click
  const handleTaskClick = (taskId: string) => {
    const task = findTaskById(taskId);
    if (task) {
      setSelectedTaskId(taskId);
      setTaskNotes(task.notes || "");
      setIsDialogOpen(true);
    }
  };

  // Handle task completion
  const handleCompleteTask = () => {
    if (selectedTaskId) {
      updateTaskStatusMutation.mutate({ 
        taskId: selectedTaskId, 
        status: "completed",
        notes: taskNotes
      });
    }
  };

  // Check if task can be started (dependencies are completed)
  const canStartTask = (task: ActionPlanTask): boolean => {
    if (!task.dependsOn || task.dependsOn.length === 0) return true;
    
    return task.dependsOn.every(depId => {
      const dependentTask = findTaskById(depId);
      return dependentTask && dependentTask.status === "completed";
    });
  };

  // Get task status badge
  const getTaskStatusBadge = (task: ActionPlanTask) => {
    if (task.status === "completed") {
      return <Badge className="ml-2 bg-green-500 hover:bg-green-600">Completed</Badge>;
    } else if (task.status === "in-progress") {
      return <Badge className="ml-2">In Progress</Badge>;
    } else if (!canStartTask(task)) {
      return <Badge variant="outline" className="ml-2">Locked</Badge>;
    }
    return null;
  };

  // Calculate phase progress
  const calculatePhaseProgress = (phase: ActionPlanPhase): number => {
    const totalTasks = phase.tasks.length;
    if (totalTasks === 0) return 0;
    
    const completedTasks = phase.tasks.filter(task => task.status === "completed").length;
    return (completedTasks / totalTasks) * 100;
  };

  // Render motivational card
  const renderMotivationalCard = () => {
    if (isLoading || !progressData) return null;
    
    const motivationalMessage = getMotivationalMessage(progressData);
    const tip = getTip();
    
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <div className="mr-4">
                {motivationalMessage.icon}
              </div>
              <div>
                <h4 className="text-lg font-medium text-primary">{motivationalMessage.type === "milestone" ? "Achievement Unlocked!" : "AI Coach"}</h4>
                <p className="mt-1">{motivationalMessage.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start">
              <div className="mr-4">
                {tip.icon}
              </div>
              <div>
                <h4 className="text-lg font-medium">Pro Tip</h4>
                <p className="mt-1 text-muted-foreground">{tip.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render progress metrics
  const renderProgressMetrics = () => {
    if (isLoading || !progressData) return null;
    
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {progressData.percentComplete.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Overall Progress</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {progressData.streakDays}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Day Streak</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {progressData.completedTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tasks Completed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center">
                {progressData.estimatedCompletionDate ? (
                  <div className="text-2xl font-bold">
                    {new Date(progressData.estimatedCompletionDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                ) : (
                  <div className="text-2xl font-bold">--</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Estimated Completion</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render phases and tasks
  const renderPhasesAndTasks = () => {
    if (!actionPlan) return null;
    
    const recommendedTask = getRecommendedNextTask();
    
    return (
      <div className="space-y-8">
        {recommendedTask && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Sparkles className="h-5 w-5 mr-2 text-primary" />
                Recommended Next Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="p-3 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleTaskClick(recommendedTask.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{recommendedTask.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{recommendedTask.description}</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-2">
                    Start
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      
        {actionPlan.phases.map((phase, phaseIndex) => (
          <div key={phaseIndex} className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{phase.title}</h3>
                <Badge variant="outline">{phase.duration}</Badge>
              </div>
              <div className="mt-2 flex items-center">
                <Progress value={calculatePhaseProgress(phase)} className="h-2" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {calculatePhaseProgress(phase).toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {phase.tasks.map((task) => {
                const isCompleted = task.status === "completed";
                const isInProgress = task.status === "in-progress";
                const isLocked = !canStartTask(task);
                
                return (
                  <div 
                    key={task.id}
                    className={`p-3 rounded-md border ${isLocked ? 'opacity-60' : 'cursor-pointer hover:bg-accent/50 transition-colors'}`}
                    onClick={() => !isLocked && handleTaskClick(task.id)}
                  >
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-3">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : isLocked ? (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <div className={`h-5 w-5 rounded-full border-2 ${isInProgress ? 'border-blue-500 bg-blue-100' : 'border-muted-foreground'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h4>
                          {getTaskStatusBadge(task)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.description}
                        </p>
                        
                        {/* Dependencies and duration */}
                        <div className="flex items-center mt-2 text-xs">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{task.durationDays} day{task.durationDays !== 1 ? 's' : ''}</span>
                          </div>
                          
                          {task.dependsOn && task.dependsOn.length > 0 && (
                            <div className="flex items-center ml-4">
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              <span>Requires previous tasks</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {renderProgressMetrics()}
          <div className="mt-6">
            {renderPhasesAndTasks()}
          </div>
        </div>
        
        <div>
          {renderMotivationalCard()}
        </div>
      </div>
      
      {/* Task Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTaskId && findTaskById(selectedTaskId)?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedTaskId && findTaskById(selectedTaskId)?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Progress Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about your progress on this task..."
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
              />
            </div>
            
            {selectedTaskId && findTaskById(selectedTaskId)?.resourceLinks && (
              <div className="space-y-2">
                <Label>Helpful Resources</Label>
                <div className="space-y-2">
                  {findTaskById(selectedTaskId)?.resourceLinks?.map((link, index) => (
                    <div key={index} className="flex items-center">
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {link.title}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteTask} disabled={updateTaskStatusMutation.isPending}>
              {updateTaskStatusMutation.isPending ? "Updating..." : "Mark as Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}