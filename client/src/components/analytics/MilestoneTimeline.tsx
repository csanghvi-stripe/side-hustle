import React, { useState } from 'react';
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/use-analytics';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Calendar, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { InsertProgressMilestone } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface MilestoneTimelineProps {
  progressId: number | null;
}

const formSchema = z.object({
  milestoneName: z.string().min(1, 'Milestone name is required'),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  revenueImpact: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export function MilestoneTimeline({ progressId }: MilestoneTimelineProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  
  const { 
    data: milestones, 
    isLoading: isLoadingMilestones,
    isError: isErrorMilestones
  } = useMilestones(progressId);
  
  const createMilestoneMutation = useCreateMilestone(progressId);
  const updateMilestoneMutation = useUpdateMilestone();
  const deleteMilestoneMutation = useDeleteMilestone();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      milestoneName: '',
      description: '',
      targetDate: '',
      revenueImpact: 0,
      notes: '',
    },
  });
  
  // Reset form when dialog opens
  const resetForm = () => {
    form.reset({
      milestoneName: '',
      description: '',
      targetDate: '',
      revenueImpact: 0,
      notes: '',
    });
  };
  
  // Set form values for editing
  const setupEditForm = (milestoneId: number) => {
    if (!milestones) return;
    
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;
    
    setEditingMilestone(milestoneId);
    
    form.reset({
      milestoneName: milestone.milestoneName,
      description: milestone.description || '',
      targetDate: milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : '',
      revenueImpact: milestone.revenueImpact ? parseFloat(milestone.revenueImpact.toString()) : 0,
      notes: milestone.notes || '',
    });
    
    setIsAddDialogOpen(true);
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!progressId) return;
    
    try {
      const milestoneData: Partial<InsertProgressMilestone> = {
        milestoneName: values.milestoneName,
        description: values.description,
        targetDate: values.targetDate,
        revenueImpact: values.revenueImpact ? values.revenueImpact.toString() : undefined,
        notes: values.notes,
      };
      
      if (editingMilestone) {
        // Update existing milestone
        await updateMilestoneMutation.mutateAsync({
          id: editingMilestone,
          data: milestoneData,
        });
      } else {
        // Create new milestone
        await createMilestoneMutation.mutateAsync(milestoneData);
      }
      
      setIsAddDialogOpen(false);
      setEditingMilestone(null);
      resetForm();
    } catch (error) {
      console.error("Error with milestone:", error);
    }
  };
  
  const handleToggleComplete = async (id: number, isCompleted: boolean) => {
    try {
      await updateMilestoneMutation.mutateAsync({
        id,
        data: {
          isCompleted: !isCompleted,
          completedDate: !isCompleted ? new Date().toISOString() : null,
        },
      });
    } catch (error) {
      console.error("Error toggling milestone completion:", error);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!progressId) return;
    
    try {
      await deleteMilestoneMutation.mutateAsync({
        id,
        progressId,
      });
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  };
  
  if (isLoadingMilestones) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>Track key steps in your progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isErrorMilestones) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>Track key steps in your progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-8 w-8 mb-4 text-destructive" />
            <h3 className="text-lg font-medium mb-2">Failed to load milestones</h3>
            <p className="text-sm text-muted-foreground">
              There was an error loading your milestone data. Please try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>Track key steps in your progress</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              resetForm();
              setEditingMilestone(null);
              setIsAddDialogOpen(true);
            }}
            disabled={!progressId}
          >
            <Plus className="mr-2 h-4 w-4" /> 
            Add Milestone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(!milestones || milestones.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock className="h-8 w-8 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No milestones yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create milestones to track your progress on this opportunity
            </p>
            <Button 
              variant="secondary" 
              onClick={() => {
                resetForm();
                setEditingMilestone(null);
                setIsAddDialogOpen(true);
              }}
              disabled={!progressId}
            >
              <Plus className="mr-2 h-4 w-4" /> 
              Add Your First Milestone
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline display */}
            <div className="relative pl-8 space-y-8">
              {/* The vertical line */}
              <div className="absolute top-0 left-3 h-full w-0.5 bg-border"></div>
              
              {/* Milestones */}
              {milestones.map((milestone, index) => (
                <div 
                  key={milestone.id} 
                  className={`relative ${milestone.isCompleted ? 'text-muted-foreground' : ''}`}
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-5 mt-1">
                    <button
                      onClick={() => handleToggleComplete(milestone.id, !!milestone.isCompleted)}
                      className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
                    >
                      {milestone.isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-blue-500" />
                      )}
                    </button>
                  </div>
                  
                  {/* Milestone content */}
                  <div className={`
                    p-4 rounded-lg border 
                    ${milestone.isCompleted 
                      ? 'bg-muted/50 border-muted' 
                      : 'bg-card border-border'}
                  `}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`text-base font-medium ${milestone.isCompleted ? 'line-through opacity-70' : ''}`}>
                        {milestone.milestoneName}
                      </h4>
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setupEditForm(milestone.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {milestone.description && (
                      <p className="text-sm mb-3">{milestone.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                      {milestone.targetDate && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>
                            Target: {new Date(milestone.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {milestone.completedDate && (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          Completed {new Date(milestone.completedDate).toLocaleDateString()}
                        </Badge>
                      )}
                      
                      {milestone.revenueImpact && parseFloat(milestone.revenueImpact.toString()) > 0 && (
                        <Badge variant="secondary">
                          Revenue Impact: {formatCurrency(milestone.revenueImpact)}
                        </Badge>
                      )}
                    </div>
                    
                    {milestone.notes && (
                      <div className="mt-2 pt-2 border-t text-xs">
                        <span className="text-muted-foreground">Notes: </span> 
                        {milestone.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Add/Edit Milestone Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
            </DialogTitle>
            <DialogDescription>
              {editingMilestone 
                ? 'Update the details of your milestone.' 
                : 'Create a new milestone to track your progress.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="milestoneName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone Name</FormLabel>
                    <FormControl>
                      <Input placeholder="What do you want to achieve?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this milestone..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="revenueImpact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potential Revenue Impact ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '0' : e.target.value;
                            field.onChange(parseFloat(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional notes..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingMilestone(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={
                    createMilestoneMutation.isPending || 
                    updateMilestoneMutation.isPending
                  }
                >
                  {(createMilestoneMutation.isPending || updateMilestoneMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingMilestone ? 'Update' : 'Create'} Milestone
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}