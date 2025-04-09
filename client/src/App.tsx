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
