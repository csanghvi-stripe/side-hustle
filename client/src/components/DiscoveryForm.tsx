import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UserInputForm, MonetizationResults } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingState from "./LoadingState";

// Form validation schema
const formSchema = z.object({
  skills: z.string().min(3, "Please enter at least one skill"),
  timeAvailability: z.string().min(1, "Please select your time availability"),
  riskAppetite: z.enum(["low", "medium", "high"], {
    required_error: "Please select your risk tolerance",
  }),
  incomeGoals: z.coerce.number().min(1, "Please enter your income goal"),
  workPreference: z.enum(["remote", "local", "both"], {
    required_error: "Please select your work preference",
  }),
  additionalDetails: z.string().optional(),
  // Social network settings
  discoverable: z.boolean().default(true),
  allowMessages: z.boolean().default(true),
  // Algorithm options
  useEnhanced: z.boolean().default(false),
});

interface DiscoveryFormProps {
  onResultsReceived: (results: MonetizationResults) => void;
}

const DiscoveryForm: React.FC<DiscoveryFormProps> = ({ onResultsReceived }) => {
  const [currentStep, setCurrentStep] = React.useState(1);
  const { toast } = useToast();

  const form = useForm<UserInputForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      skills: "",
      timeAvailability: "",
      riskAppetite: "medium",
      incomeGoals: 0,
      workPreference: "remote",
      additionalDetails: "",
      // Social network defaults
      discoverable: true,
      allowMessages: true,
      // Algorithm option
      useEnhanced: false,
    },
  });

  const generateOpportunities = useMutation({
    mutationFn: async (data: UserInputForm) => {
      const response = await apiRequest("POST", "/api/opportunities/discover", data);
      const results = await response.json();
      return results as MonetizationResults;
    },
    onSuccess: (data) => {
      onResultsReceived(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate opportunities: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserInputForm) => {
    console.log("Form submitted with data:", data);
    // Check if form validation passes
    const isValid = form.formState.isValid;
    console.log("Form validation status:", isValid);
    if (!isValid) {
      console.log("Form validation errors:", form.formState.errors);
      toast({
        title: "Form validation failed",
        description: "Please make sure all required fields are filled correctly.",
        variant: "destructive",
      });
      return;
    }
    
    // If validation passes, submit the form
    generateOpportunities.mutate(data);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      const step1Valid = form.trigger(["skills", "incomeGoals"]);
      if (!step1Valid) return;
    }
    if (currentStep === 2) {
      const step2Valid = form.trigger(["timeAvailability", "riskAppetite", "workPreference"]);
      if (!step2Valid) return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (generateOpportunities.isPending) {
    return <LoadingState useEnhanced={form.getValues().useEnhanced} />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8 border border-neutral-100">
      {/* Form Header */}
      <div className="bg-primary text-white px-6 py-4">
        <h2 className="text-xl font-medium">Your Monetization Profile</h2>
        <p className="text-primary-50">Tell us about your skills and preferences to discover personalized opportunities</p>
      </div>
      
      {/* Form Progress */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'}`}>1</div>
            <div className="ml-2 text-sm font-medium">Skills & Goals</div>
          </div>
          <div className="w-12 h-1 bg-neutral-100"></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'}`}>2</div>
            <div className={`ml-2 text-sm font-medium ${currentStep >= 2 ? '' : 'text-neutral-400'}`}>Preferences</div>
          </div>
          <div className="w-12 h-1 bg-neutral-100"></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${currentStep === 3 ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'}`}>3</div>
            <div className={`ml-2 text-sm font-medium ${currentStep === 3 ? '' : 'text-neutral-400'}`}>Community</div>
          </div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6 space-y-6">
          {/* Step 1: Skills & Goals */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      What skills or expertise do you have? <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about your skills, experience, and expertise (e.g., graphic design, writing, programming, marketing, teaching, etc.)"
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Be specific about your skills to get more targeted opportunities
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="incomeGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Monthly income goal <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-neutral-500 sm:text-sm">$</span>
                        </div>
                        <Input
                          type="number"
                          placeholder="500"
                          className="pl-7 pr-12"
                          {...field}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-neutral-500 sm:text-sm">/month</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      How much extra income would you like to make per month?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Additional details (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any other information that might help us find better opportunities for you (e.g., your interests, background, current job, etc.)"
                        className="min-h-[80px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This helps us tailor recommendations to your specific situation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end mt-6">
                <Button type="button" onClick={nextStep} className="bg-primary hover:bg-primary/90">
                  Next
                  <svg
                    className="ml-1 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="timeAvailability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Available time per week <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your available time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1-5">1-5 hours/week</SelectItem>
                        <SelectItem value="5-10">5-10 hours/week</SelectItem>
                        <SelectItem value="10-20">10-20 hours/week</SelectItem>
                        <SelectItem value="20+">20+ hours/week</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How much time can you dedicate to new income opportunities?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskAppetite"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-medium">
                      Risk tolerance <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="low" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Low - Stable, predictable income even if smaller
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="medium" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Medium - Balanced opportunities with moderate risk
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="high" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            High - Willing to invest time/money for higher potential returns
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      This helps us match opportunities to your comfort level with uncertainty
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workPreference"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-medium">
                      Work preference <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="remote" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Remote - Work from anywhere
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="local" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Local - In-person opportunities
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="both" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Both - Open to all options
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Do you prefer remote work or are you open to local opportunities?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  <svg
                    className="mr-1 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={nextStep}
                  className="bg-primary hover:bg-primary/90"
                >
                  Next
                  <svg
                    className="ml-1 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Community Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border p-4 rounded-lg bg-primary/5 mb-6">
                <h3 className="text-base font-medium mb-2">Community Features</h3>
                <p className="text-sm text-neutral-600 mb-1">
                  Our community helps you connect with others who have similar skills and interests.
                  Choose your networking preferences below:
                </p>
              </div>

              <FormField
                control={form.control}
                name="discoverable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        Make my profile discoverable
                      </FormLabel>
                      <FormDescription>
                        Allow others to find you in the community based on your skills and interests.
                        We'll suggest connections with similar monetization paths.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowMessages"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        Allow direct messages
                      </FormLabel>
                      <FormDescription>
                        Receive messages from community members who may want to collaborate
                        or share opportunities with you.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="border p-4 rounded-lg bg-primary/5 mt-6">
                <h3 className="text-base font-medium mb-2">Advanced Options</h3>
                <p className="text-sm text-neutral-600 mb-1">
                  Fine-tune how we generate your monetization opportunities:
                </p>
              </div>

              <FormField
                control={form.control}
                name="useEnhanced"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        Use enhanced algorithm
                      </FormLabel>
                      <FormDescription>
                        Combine AI with real-time web search for more up-to-date, actionable recommendations.
                        This takes a bit longer but provides higher quality results.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  <svg
                    className="mr-1 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={generateOpportunities.isPending}
                  className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all px-5 py-6 text-lg font-medium button-hover-effect"
                  onClick={(e) => {
                    console.log("Submit button clicked");
                    // We'll keep the type="submit" to let the form's onSubmit handle it
                    // This is just for additional debugging
                  }}
                >
                  Find Monetization Opportunities
                  <svg
                    className="ml-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
};

export default DiscoveryForm;
