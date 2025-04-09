import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage, 
  FormDescription 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateProgressTracking } from '@/hooks/use-analytics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserOpportunities } from '@/hooks/use-opportunities';
import { Loader2 } from 'lucide-react';
import { InsertProgressTracking } from '@shared/schema';

interface CreateProgressFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  opportunityId: z.coerce.number({
    required_error: "Please select an opportunity",
  }),
  opportunityTitle: z.string().min(1, "Opportunity title is required"),
  opportunityType: z.string().min(1, "Opportunity type is required"),
  currentStage: z.enum(["Planning", "Implementing", "Growing", "Scaling", "Completed"], {
    required_error: "Please select a stage",
  }),
  nextMilestone: z.string().optional(),
  targetDate: z.string().optional(),
  timeInvestedHours: z.coerce.number().min(0).optional(),
  costInvested: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateProgressForm({ isOpen, onClose }: CreateProgressFormProps) {
  const { toast } = useToast();
  const { data: userOpportunities, isLoading: isLoadingOpportunities } = useUserOpportunities();
  const createProgressMutation = useCreateProgressTracking();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      opportunityId: 0,
      opportunityTitle: '',
      opportunityType: '',
      currentStage: 'Planning',
      nextMilestone: '',
      timeInvestedHours: 0,
      costInvested: 0,
      notes: '',
    },
  });
  
  const onSubmit = async (values: FormValues) => {
    try {
      const progressData: InsertProgressTracking = {
        ...values,
        startDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalRevenue: "0",
      };
      
      await createProgressMutation.mutateAsync(progressData);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error creating progress tracking:", error);
    }
  };
  
  // Handle opportunity selection and auto-fill fields
  const handleOpportunityChange = (opportunityId: string) => {
    const selectedOpportunity = userOpportunities?.find(
      opp => opp.id.toString() === opportunityId
    );
    
    if (selectedOpportunity) {
      // Extract opportunity details from the saved opportunity
      // The structure depends on how opportunities are stored
      const opportunityData = selectedOpportunity.opportunityData;
      
      let title = '';
      let type = '';
      
      if (typeof opportunityData === 'object' && opportunityData !== null) {
        // Try to extract title and type based on your data structure
        if ('opportunities' in opportunityData && Array.isArray(opportunityData.opportunities) && opportunityData.opportunities.length > 0) {
          const firstOpp = opportunityData.opportunities[0];
          title = firstOpp.title || '';
          type = firstOpp.type || '';
        } else if ('title' in opportunityData) {
          title = opportunityData.title;
          type = opportunityData.type || '';
        }
      }
      
      form.setValue('opportunityTitle', title);
      form.setValue('opportunityType', type);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start Tracking Progress</DialogTitle>
          <DialogDescription>
            Track your progress on a monetization opportunity to measure your success over time.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="opportunityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleOpportunityChange(value);
                    }}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an opportunity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingOpportunities ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : userOpportunities && userOpportunities.length > 0 ? (
                        userOpportunities.map(opportunity => (
                          <SelectItem key={opportunity.id} value={opportunity.id.toString()}>
                            {opportunity.title || `Opportunity #${opportunity.id}`}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-2 text-sm text-muted-foreground">
                          No saved opportunities found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a previously saved opportunity to track
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="opportunityTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opportunity Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="opportunityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opportunity Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Freelance">Freelance</SelectItem>
                        <SelectItem value="Digital Product">Digital Product</SelectItem>
                        <SelectItem value="Content Creation">Content Creation</SelectItem>
                        <SelectItem value="Service-Based">Service-Based</SelectItem>
                        <SelectItem value="Passive Income">Passive Income</SelectItem>
                        <SelectItem value="Info Product">Info Product</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stage</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Planning">Planning</SelectItem>
                        <SelectItem value="Implementing">Implementing</SelectItem>
                        <SelectItem value="Growing">Growing</SelectItem>
                        <SelectItem value="Scaling">Scaling</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Completion Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="nextMilestone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Milestone</FormLabel>
                  <FormControl>
                    <Input placeholder="What's your next milestone?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeInvestedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Invested (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="costInvested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Invested ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
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
                      placeholder="Any additional notes about your progress..." 
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
                onClick={onClose}
                disabled={createProgressMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createProgressMutation.isPending}
              >
                {createProgressMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Tracking
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}