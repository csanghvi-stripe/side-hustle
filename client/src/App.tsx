import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AuthPage from "@/pages/auth-page";
import InboxPage from "@/pages/inbox-page";
import SettingsPage from "@/pages/settings-page";
import SavedOpportunitiesPage from "@/pages/saved-opportunities-page";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import CoachPage from "@/pages/coach-page";
import SubscriptionPage from "@/pages/subscription-page";
import ResourcesPage from "@/pages/resources-page";
import CommunityPage from "@/pages/community-page";
import SkillsAssessmentPage from "@/pages/skills-assessment-page";
import PricingCalculatorPage from "@/pages/pricing-calculator-page";
import ActionPlanPage from "@/pages/action-plan-page";
import OpportunityDetailPage from "@/pages/opportunity-detail-page";
import BlogPage from "@/pages/blog-page";
import BlogPostPage from "@/pages/blog-post-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import AppHeader from "@/components/AppHeader";

function Router() {
  return (
    <>
      <AppHeader />
      <main>
        <Switch>
          <ProtectedRoute path="/" component={Home} />
          <ProtectedRoute path="/inbox" component={InboxPage} />
          <ProtectedRoute path="/settings" component={SettingsPage} />
          <ProtectedRoute path="/saved-opportunities" component={SavedOpportunitiesPage} />
          <ProtectedRoute path="/analytics" component={AnalyticsDashboard} />
          <ProtectedRoute path="/coach" component={CoachPage} />
          <ProtectedRoute path="/subscription" component={SubscriptionPage} />
          <ProtectedRoute path="/resources" component={ResourcesPage} />
          <ProtectedRoute path="/community" component={CommunityPage} />
          <ProtectedRoute path="/skills-assessment" component={SkillsAssessmentPage} />
          <ProtectedRoute path="/pricing-calculator" component={PricingCalculatorPage} />
          <ProtectedRoute path="/action-plan" component={ActionPlanPage} />
          <ProtectedRoute path="/opportunity/:id" component={OpportunityDetailPage} />
          <ProtectedRoute path="/saved-opportunities/:id" component={OpportunityDetailPage} />
          <Route path="/blog" component={BlogPage} />
          <Route path="/blog/:slug" component={BlogPostPage} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
