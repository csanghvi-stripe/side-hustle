import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import PricingCalculator from "@/components/assessment/PricingCalculator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, DollarSign, LineChart, ShieldCheck, BookOpen } from "lucide-react";

export default function PricingCalculatorPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pricing Calculator</h1>
              <p className="text-muted-foreground">
                Determine the right rates for your services based on market data and your unique value
              </p>
            </div>
          </div>

          <PricingCalculator />
          
          <Alert variant="default" className="bg-primary/5 border-primary/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pro Tip</AlertTitle>
            <AlertDescription>
              Offering multiple pricing tiers can capture clients with different budgets. 
              Consider creating basic, standard, and premium packages with different deliverables.
            </AlertDescription>
          </Alert>
        </div>
        
        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Why Pricing Matters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Setting the right price is crucial for your success as an independent worker.
                It affects not only your income but also how clients perceive your value.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <LineChart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">Based on Market Data</h4>
                    <p className="text-xs text-muted-foreground">
                      Our calculator uses real-world market data to recommend competitive rates.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">Avoid Undervaluing</h4>
                    <p className="text-xs text-muted-foreground">
                      Many independents charge too little. Our tool helps you set rates that reflect your true value.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Price Benchmarks
              </CardTitle>
              <CardDescription>
                Average rates by experience level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Hourly Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Badge variant="outline">Beginner</Badge>
                    </TableCell>
                    <TableCell className="text-right">$15-25</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge variant="outline">Intermediate</Badge>
                    </TableCell>
                    <TableCell className="text-right">$25-50</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge variant="outline">Advanced</Badge>
                    </TableCell>
                    <TableCell className="text-right">$50-100</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge variant="outline">Expert</Badge>
                    </TableCell>
                    <TableCell className="text-right">$100-250+</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-2">
                *Rates vary widely by industry and location
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}