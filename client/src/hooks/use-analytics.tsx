import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  ProgressTracking, 
  InsertProgressTracking, 
  ProgressMilestone,
  InsertProgressMilestone,
  IncomeEntry,
  InsertIncomeEntry
} from '@shared/schema';
import { toast } from '@/hooks/use-toast';

// Progress Tracking Hooks

export function useProgressTrackings() {
  return useQuery<ProgressTracking[]>({
    queryKey: ['/api/analytics/progress'],
  });
}

export function useProgressTracking(id: number | null) {
  return useQuery<ProgressTracking>({
    queryKey: ['/api/analytics/progress', id],
    enabled: !!id,
  });
}

export function useCreateProgressTracking() {
  return useMutation({
    mutationFn: async (data: InsertProgressTracking) => {
      const response = await apiRequest('POST', '/api/analytics/progress', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Progress tracking created',
        description: 'Your progress tracking has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create progress tracking',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProgressTracking() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProgressTracking> }) => {
      const response = await apiRequest('PATCH', `/api/analytics/progress/${id}`, data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Progress tracking updated',
        description: 'Your progress tracking has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update progress tracking',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProgressTracking() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/analytics/progress/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Progress tracking deleted',
        description: 'Your progress tracking has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete progress tracking',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Milestone Hooks

export function useMilestones(progressId: number | null) {
  return useQuery<ProgressMilestone[]>({
    queryKey: ['/api/analytics/milestones', progressId],
    enabled: !!progressId,
  });
}

export function useCreateMilestone(progressId: number | null) {
  return useMutation({
    mutationFn: async (data: Partial<InsertProgressMilestone>) => {
      if (!progressId) throw new Error('Progress ID is required');
      
      const response = await apiRequest('POST', `/api/analytics/progress/${progressId}/milestones`, {
        ...data,
        progressId,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Milestone created',
        description: 'Your milestone has been created successfully.',
      });
      if (progressId) {
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/milestones', progressId] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress', progressId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create milestone',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMilestone() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProgressMilestone> }) => {
      const response = await apiRequest('PATCH', `/api/analytics/milestones/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Milestone updated',
        description: 'Your milestone has been updated successfully.',
      });
      
      if (data && data.progressId) {
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/milestones', data.progressId] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress', data.progressId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update milestone',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMilestone() {
  return useMutation({
    mutationFn: async ({ id, progressId }: { id: number; progressId: number }) => {
      await apiRequest('DELETE', `/api/analytics/milestones/${id}`);
      return { progressId };
    },
    onSuccess: (data) => {
      toast({
        title: 'Milestone deleted',
        description: 'Your milestone has been deleted successfully.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/milestones', data.progressId] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress', data.progressId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete milestone',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Income Entry Hooks

export function useIncomeEntries(progressId: number | null) {
  return useQuery<IncomeEntry[]>({
    queryKey: ['/api/analytics/income', progressId],
    enabled: !!progressId,
  });
}

export function useUserIncomeEntries() {
  return useQuery<IncomeEntry[]>({
    queryKey: ['/api/analytics/income/user'],
  });
}

export function useCreateIncomeEntry(progressId: number | null) {
  return useMutation({
    mutationFn: async (data: Partial<InsertIncomeEntry>) => {
      if (!progressId) throw new Error('Progress ID is required');
      
      const response = await apiRequest('POST', `/api/analytics/progress/${progressId}/income`, {
        ...data,
        progressId,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Income entry created',
        description: 'Your income entry has been recorded successfully.',
      });
      
      if (progressId) {
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/income', progressId] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/income/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress', progressId] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/time-to-first-dollar'] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create income entry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateIncomeEntry() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertIncomeEntry> }) => {
      const response = await apiRequest('PATCH', `/api/analytics/income/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Income entry updated',
        description: 'Your income entry has been updated successfully.',
      });
      
      if (data && data.progressId) {
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/income', data.progressId] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/income/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress', data.progressId] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update income entry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteIncomeEntry() {
  return useMutation({
    mutationFn: async ({ id, progressId }: { id: number; progressId: number }) => {
      await apiRequest('DELETE', `/api/analytics/income/${id}`);
      return { progressId };
    },
    onSuccess: (data) => {
      toast({
        title: 'Income entry deleted',
        description: 'Your income entry has been deleted successfully.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/income', data.progressId] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/income/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/progress', data.progressId] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete income entry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Dashboard and Summary Hooks

export function useAnalyticsDashboard() {
  return useQuery<{
    totalRevenue: number;
    totalOpportunities: number;
    opportunitiesWithRevenue: number;
    successRate: number;
    avgTimeToFirstDollar: number;
    opportunitiesByType: Record<string, number>;
    revenueByMonth: Record<string, number>;
  }>({
    queryKey: ['/api/analytics/dashboard'],
  });
}

export function useTimeToFirstDollar() {
  return useQuery<Array<{
    opportunityId: number;
    opportunityTitle: string;
    days: number;
  }>>({
    queryKey: ['/api/analytics/time-to-first-dollar'],
  });
}

export function createStatCard({ title, value, description }: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return {
    title,
    value,
    description,
  };
}