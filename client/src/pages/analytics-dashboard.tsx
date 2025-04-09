import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAnalyticsDashboard, useTimeToFirstDollar, useProgressTrackings } from '@/hooks/use-analytics';
import { StatCard } from '@/components/analytics/StatCard';
import { ProgressTrackingList } from '@/components/analytics/ProgressTrackingList';
import { CreateProgressForm } from '@/components/analytics/CreateProgressForm';
import { IncomeEntryForm } from '@/components/analytics/IncomeEntryForm';
import { IncomeHistoryTable } from '@/components/analytics/IncomeHistoryTable';
import { MilestoneTimeline } from '@/components/analytics/MilestoneTimeline';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, TrendingUp, Clock, BarChart3, PieChart } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressTracking } from '@shared/schema';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateProgressFormOpen, setIsCreateProgressFormOpen] = useState(false);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<ProgressTracking | null>(null);
  
  // Queries
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useAnalyticsDashboard();
  const { data: timeToFirstDollar, isLoading: isTimeToFirstDollarLoading } = useTimeToFirstDollar();

  if (!user) {
    return null;
  }

  const isLoading = isAnalyticsLoading || isTimeToFirstDollarLoading;

  const handleProgressSelect = (progress: ProgressTracking) => {
    setSelectedProgress(progress);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <Button variant="outline" onClick={() => window.print()} className="hidden md:flex">
            Export Report
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full mb-8"
        >
          <TabsList className="grid grid-cols-3 md:w-[400px] mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              // Loading skeletons
              Array(4).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-[120px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-[80px] mb-2" />
                    <Skeleton className="h-3 w-[140px]" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(analyticsData?.totalRevenue || 0)}
                  icon={<DollarSign className="h-4 w-4" />}
                />
                <StatCard
                  title="Success Rate"
                  value={`${Math.round(analyticsData?.successRate || 0)}%`}
                  description={`${analyticsData?.opportunitiesWithRevenue || 0} out of ${analyticsData?.totalOpportunities || 0} opportunities`}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <StatCard
                  title="Avg. Time to First Dollar"
                  value={analyticsData?.avgTimeToFirstDollar 
                    ? `${Math.round(analyticsData.avgTimeToFirstDollar)} days` 
                    : 'N/A'}
                  icon={<Clock className="h-4 w-4" />}
                />
                <StatCard
                  title="Total Opportunities"
                  value={analyticsData?.totalOpportunities || 0}
                  icon={<BarChart3 className="h-4 w-4" />}
                />
              </>
            )}
          </div>

          {/* Opportunity Types Chart */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Opportunities by Type</CardTitle>
              <CardDescription>
                Distribution of your monetization opportunities by type
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {isLoading ? (
                <div className="w-full aspect-[2/1] flex items-center justify-center bg-muted/20 rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsData?.opportunitiesByType && Object.keys(analyticsData.opportunitiesByType).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={Object.entries(analyticsData.opportunitiesByType).map(([name, value]) => ({
                        name,
                        value,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(analyticsData.opportunitiesByType).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <PieChart className="h-8 w-8 mb-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No data available</h3>
                  <p className="text-sm text-muted-foreground">
                    Start tracking your opportunities to see analytics here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time to First Dollar Chart */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Time to First Dollar</CardTitle>
              <CardDescription>
                How quickly each opportunity started generating revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="w-full aspect-[2/1] flex items-center justify-center bg-muted/20 rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : timeToFirstDollar && timeToFirstDollar.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeToFirstDollar}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="opportunityTitle" />
                    <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => [`${value} days`, 'Time to Revenue']}
                      labelFormatter={(label) => `Opportunity: ${label}`}
                    />
                    <Bar dataKey="days" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <BarChart3 className="h-8 w-8 mb-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No revenue data available</h3>
                  <p className="text-sm text-muted-foreground">
                    Log your first income entry to see how quickly you generated revenue
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Progress tracking list */}
              <div className="md:col-span-1">
                <ProgressTrackingList 
                  onSelect={handleProgressSelect}
                  onCreateNew={() => setIsCreateProgressFormOpen(true)}
                />
              </div>
              
              {/* Selected progress details */}
              <div className="md:col-span-2 space-y-6">
                {selectedProgress ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>{selectedProgress.opportunityTitle}</CardTitle>
                        <CardDescription>
                          Started: {new Date(selectedProgress.startDate).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Current Stage</p>
                            <p className="font-medium">{selectedProgress.currentStage}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                            <p className="font-medium">{formatCurrency(selectedProgress.totalRevenue || 0)}</p>
                          </div>
                          {selectedProgress.timeInvested && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Time Invested</p>
                              <p className="font-medium">{selectedProgress.timeInvested} hours</p>
                            </div>
                          )}
                          {selectedProgress.costInvested && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Cost Invested</p>
                              <p className="font-medium">{formatCurrency(selectedProgress.costInvested)}</p>
                            </div>
                          )}
                        </div>
                        
                        {selectedProgress.notes && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-1">Notes</p>
                            <p>{selectedProgress.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Milestones */}
                    <MilestoneTimeline progressId={selectedProgress.id} />
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center text-center py-20">
                      <h3 className="text-lg font-medium mb-2">No progress tracking selected</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Select a progress tracking from the list or create a new one to view details
                      </p>
                      <Button onClick={() => setIsCreateProgressFormOpen(true)}>
                        Create New Progress Tracking
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Progress/Opportunity select list (smaller version) */}
              <div className="md:col-span-1">
                <ProgressTrackingList 
                  onSelect={handleProgressSelect}
                  onCreateNew={() => setIsCreateProgressFormOpen(true)}
                />
              </div>
              
              {/* Income history and entry */}
              <div className="md:col-span-2 space-y-6">
                <IncomeHistoryTable 
                  progressId={selectedProgress?.id || null}
                  onAddIncomeClick={() => setIsIncomeFormOpen(true)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Modals */}
        <CreateProgressForm 
          isOpen={isCreateProgressFormOpen}
          onClose={() => setIsCreateProgressFormOpen(false)}
        />
        
        <IncomeEntryForm 
          progressId={selectedProgress?.id || null}
          isOpen={isIncomeFormOpen}
          onClose={() => setIsIncomeFormOpen(false)}
        />
      </div>
    </div>
  );
}