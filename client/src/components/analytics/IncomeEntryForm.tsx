import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateIncomeEntry, useUpdateIncomeEntry } from '@/hooks/use-analytics';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { IncomeEntry } from '@shared/schema';

interface IncomeEntryFormProps {
  progressId: number | null;
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: IncomeEntry | null;
}

const formSchema = z.object({
  amount: z.coerce
    .number()
    .min(0.01, "Amount must be greater than 0"),
  source: z.string().min(1, "Source is required"),
  entryDate: z.string().min(1, "Date is required"),
  category: z.string().optional(),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function IncomeEntryForm({ 
  progressId, 
  isOpen, 
  onClose, 
  entryToEdit 
}: IncomeEntryFormProps) {
  const createIncomeEntry = useCreateIncomeEntry(progressId);
  const updateIncomeEntry = useUpdateIncomeEntry();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: entryToEdit ? parseFloat(entryToEdit.amount.toString()) : 0,
      source: entryToEdit?.source || '',
      entryDate: entryToEdit?.entryDate 
        ? new Date(entryToEdit.entryDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      category: entryToEdit?.category || 'Sales',
      isRecurring: entryToEdit?.isRecurring || false,
      notes: entryToEdit?.notes || '',
    },
  });
  
  const onSubmit = async (values: FormValues) => {
    try {
      if (entryToEdit) {
        // Update existing entry
        await updateIncomeEntry.mutateAsync({
          id: entryToEdit.id,
          data: values,
        });
      } else {
        // Create new entry
        if (!progressId) return;
        await createIncomeEntry.mutateAsync(values);
      }
      
      onClose();
      form.reset();
    } catch (error) {
      console.error("Error with income entry:", error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{entryToEdit ? 'Edit Income Entry' : 'Add Income Entry'}</DialogTitle>
          <DialogDescription>
            {entryToEdit 
              ? 'Update the details of your income entry.' 
              : 'Record a new income generated from this opportunity.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        placeholder="0.00" 
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
              
              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
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
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input placeholder="Where did this income come from?" {...field} />
                  </FormControl>
                  <FormDescription>
                    e.g., Client payment, Product sale, Royalty
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Consulting">Consulting</SelectItem>
                        <SelectItem value="Affiliate">Affiliate</SelectItem>
                        <SelectItem value="Advertising">Advertising</SelectItem>
                        <SelectItem value="Royalty">Royalty</SelectItem>
                        <SelectItem value="Subscription">Subscription</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Recurring Income?</FormLabel>
                      <FormDescription>
                        Is this income recurring monthly?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
                      placeholder="Any additional details about this income..."
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
                disabled={createIncomeEntry.isPending || updateIncomeEntry.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createIncomeEntry.isPending || updateIncomeEntry.isPending}
              >
                {(createIncomeEntry.isPending || updateIncomeEntry.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {entryToEdit ? 'Update' : 'Save'} Income Entry
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}