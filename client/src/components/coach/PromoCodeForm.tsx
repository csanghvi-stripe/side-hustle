import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

const promoCodeSchema = z.object({
  code: z.string().min(1, 'Promotion code is required'),
});

type PromoCodeFormValues = z.infer<typeof promoCodeSchema>;

interface PromoCodeFormProps {
  onSuccess: (credits: number) => void;
}

export default function PromoCodeForm({ onSuccess }: PromoCodeFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  const applyPromoCodeMutation = useMutation({
    mutationFn: async (values: PromoCodeFormValues) => {
      setIsSubmitting(true);
      const response = await apiRequest('POST', '/api/coach/apply-promo', values);
      const data = await response.json();
      setIsSubmitting(false);
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Success!',
          description: data.message,
          variant: 'default',
        });
        form.reset();
        if (data.credits) {
          onSuccess(data.credits);
        }
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: 'Failed to apply promo code. Please try again.',
        variant: 'destructive',
      });
    },
  });

  function onSubmit(values: PromoCodeFormValues) {
    applyPromoCodeMutation.mutate(values);
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Redeem a Promo Code</CardTitle>
        <CardDescription>
          Enter your promotion code to get free chat credits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promotion Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your promo code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Applying...' : 'Apply Code'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        Use code WELCOME100 to get 100 free credits
      </CardFooter>
    </Card>
  );
}