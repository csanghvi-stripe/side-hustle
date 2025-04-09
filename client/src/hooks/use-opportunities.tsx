import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { MonetizationOpportunity } from '@shared/schema';
import { toast } from '@/hooks/use-toast';

// Hook to fetch user's saved opportunities
export function useUserOpportunities() {
  return useQuery<MonetizationOpportunity[]>({
    queryKey: ['/api/opportunities'],
    retry: 1,
  });
}

// Hook to fetch shared opportunities
export function useSharedOpportunities() {
  return useQuery<MonetizationOpportunity[]>({
    queryKey: ['/api/opportunities/shared'],
    retry: 1,
  });
}

// Hook to save an opportunity
export function useSaveOpportunity() {
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save opportunity');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      toast({
        title: 'Success',
        description: 'Opportunity saved successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  return mutation;
}