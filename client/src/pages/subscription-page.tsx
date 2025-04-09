import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

const PricingCard = ({ 
  title, 
  price, 
  features, 
  isPopular = false,
  onSubscribe,
  loading = false
}: { 
  title: string; 
  price: string; 
  features: string[]; 
  isPopular?: boolean;
  onSubscribe: () => void;
  loading?: boolean;
}) => {
  return (
    <Card className={`w-full ${isPopular ? 'border-primary shadow-lg' : ''}`}>
      <CardHeader>
        {isPopular && (
          <div className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-full w-fit mb-2">
            Most Popular
          </div>
        )}
        <CardTitle className="text-xl">{title}</CardTitle>
        <div className="flex items-baseline mt-2">
          <span className="text-3xl font-bold">{price}</span>
          {price !== 'Free' && <span className="text-sm text-muted-foreground ml-1">/month</span>}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onSubscribe} 
          className="w-full" 
          variant={isPopular ? "default" : "outline"}
          disabled={loading}
        >
          {loading ? "Processing..." : title === "Free" ? "Current Plan" : "Subscribe"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get subscription info
  const { data: subscriptionInfo, isLoading } = useQuery({
    queryKey: ['/api/coach/subscription-info'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/coach/subscription-info');
      if (!res.ok) throw new Error('Failed to fetch subscription info');
      return res.json();
    }
  });

  // Mock subscription mutation - in a real app, this would connect to Stripe or another payment processor
  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      // TODO: Replace with actual Stripe integration
      // This is a temporary mock endpoint to simulate subscription
      const res = await apiRequest('POST', '/api/coach/apply-promo', { code: 'WELCOME100' });
      if (!res.ok) throw new Error('Failed to process subscription');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coach/subscription-info'] });
      toast({
        title: "Subscription successful!",
        description: "You now have access to the AI Coach. For demo purposes, we've added 100 credits.",
      });
      navigate('/coach');
    },
    onError: (error) => {
      toast({
        title: "Subscription failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleSubscribe = (planId: string) => {
    // For demo purposes, direct user to promo code redemption
    if (planId === 'free') {
      navigate('/coach');
      return;
    }
    
    subscribeMutation.mutate(planId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentPlan = subscriptionInfo?.tier || 'free';

  return (
    <div className="container py-12 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">AI Coach Subscription Plans</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that best fits your needs and get personalized coaching to accelerate your side hustle journey
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <PricingCard
          title="Free"
          price="Free"
          features={[
            "Limited opportunity suggestions",
            "Basic analytics dashboard",
            "Social networking features",
            "No AI coach assistance"
          ]}
          onSubscribe={() => handleSubscribe('free')}
          loading={subscribeMutation.isPending}
        />
        <PricingCard
          title="Pro"
          price="$9.99"
          features={[
            "Unlimited opportunity suggestions",
            "Full analytics dashboard",
            "Social networking features",
            "100 AI coach messages per month",
            "Progress tracking tools"
          ]}
          isPopular={true}
          onSubscribe={() => handleSubscribe('pro')}
          loading={subscribeMutation.isPending}
        />
        <PricingCard
          title="Enterprise"
          price="$19.99"
          features={[
            "All Pro features",
            "Unlimited AI coach messages",
            "Priority support",
            "Custom opportunity recommendations",
            "Advanced analytics",
            "Team collaboration tools"
          ]}
          onSubscribe={() => handleSubscribe('enterprise')}
          loading={subscribeMutation.isPending}
        />
      </div>
      
      <div className="text-center mt-12">
        <p className="text-sm text-muted-foreground mb-2">
          For demonstration purposes, all plans currently use promo code WELCOME100
        </p>
        <Button 
          variant="link" 
          onClick={() => navigate('/coach')}
        >
          Go back to AI Coach
        </Button>
      </div>
    </div>
  );
}