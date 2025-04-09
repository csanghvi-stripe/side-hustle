import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, User } from "lucide-react";
import { z } from "zod";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { loginMutation, registerMutation, user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState({ username: "", password: "" });
  
  // Register form state
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerErrors, setRegisterErrors] = useState({ 
    username: "", 
    email: "", 
    password: "", 
    confirmPassword: "" 
  });

  // Get the current tab from URL if provided
  useEffect(() => {
    // First check for the tab query parameter
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'register') {
      setActiveTab("register");
    }
    // Then check for the legacy path approach
    else {
      const path = window.location.pathname;
      if (path === "/auth/register") {
        setActiveTab("register");
      }
    }
  }, []);

  useEffect(() => {
    // Only redirect if we have a user AND we're not in a loading state
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  // Validation schemas
  const loginSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

  const validateLoginForm = () => {
    try {
      loginSchema.parse({ username: loginUsername, password: loginPassword });
      setLoginErrors({ username: "", password: "" });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { username: "", password: "" };
        error.errors.forEach(err => {
          const path = err.path[0] as keyof typeof newErrors;
          if (path in newErrors) {
            newErrors[path] = err.message;
          }
        });
        setLoginErrors(newErrors);
      }
      return false;
    }
  };

  const validateRegisterForm = () => {
    try {
      registerSchema.parse({ 
        username: registerUsername, 
        email: registerEmail, 
        password: registerPassword, 
        confirmPassword: registerConfirmPassword 
      });
      setRegisterErrors({ username: "", email: "", password: "", confirmPassword: "" });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { username: "", email: "", password: "", confirmPassword: "" };
        error.errors.forEach(err => {
          const path = err.path[0] as keyof typeof newErrors;
          if (path in newErrors) {
            newErrors[path] = err.message;
          }
        });
        setRegisterErrors(newErrors);
      }
      return false;
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }
    
    try {
      await loginMutation.mutateAsync({
        username: loginUsername,
        password: loginPassword,
      });
      // Successful login will update the user in useAuth
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid username or password",
      });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegisterForm()) {
      return;
    }
    
    try {
      await registerMutation.mutateAsync({
        username: registerUsername,
        email: registerEmail,
        password: registerPassword,
      });
      // Successful registration will update the user in useAuth
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left column - Auth form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 bg-white">
        <Card className="w-full max-w-md border-none shadow-none">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                SideHustle
              </span>
            </CardTitle>
            <CardDescription>
              Discover monetization opportunities tailored to your unique skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Username"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className={`pl-10 ${loginErrors.username ? "border-red-500" : ""}`}
                      />
                    </div>
                    {loginErrors.username && (
                      <p className="text-xs text-red-500">{loginErrors.username}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className={`pl-10 ${loginErrors.password ? "border-red-500" : ""}`}
                      />
                    </div>
                    {loginErrors.password && (
                      <p className="text-xs text-red-500">{loginErrors.password}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Logging in..." : "Log In"}
                  </Button>
                  
                  <p className="text-sm text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <Button 
                      variant="link" 
                      className="p-0" 
                      onClick={() => setActiveTab("register")}
                    >
                      Register
                    </Button>
                  </p>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Username"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        className={`pl-10 ${registerErrors.username ? "border-red-500" : ""}`}
                      />
                    </div>
                    {registerErrors.username && (
                      <p className="text-xs text-red-500">{registerErrors.username}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className={`pl-10 ${registerErrors.email ? "border-red-500" : ""}`}
                      />
                    </div>
                    {registerErrors.email && (
                      <p className="text-xs text-red-500">{registerErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className={`pl-10 ${registerErrors.password ? "border-red-500" : ""}`}
                      />
                    </div>
                    {registerErrors.password && (
                      <p className="text-xs text-red-500">{registerErrors.password}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Confirm Password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        className={`pl-10 ${registerErrors.confirmPassword ? "border-red-500" : ""}`}
                      />
                    </div>
                    {registerErrors.confirmPassword && (
                      <p className="text-xs text-red-500">{registerErrors.confirmPassword}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                  
                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{" "}
                    <Button 
                      variant="link" 
                      className="p-0" 
                      onClick={() => setActiveTab("login")}
                    >
                      Log in
                    </Button>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Right column - Hero content */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-r from-primary/10 to-indigo-500/10 p-8 flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-2">Turn Your Skills Into Income</h1>
          <p className="text-lg text-muted-foreground mb-6">
            SideHustle helps you discover personalized monetization opportunities based on your unique skills and interests.
          </p>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">AI-Powered Opportunity Discovery</h3>
                <p className="text-sm text-muted-foreground">Receive tailored recommendations based on your skills, time availability, and risk tolerance.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Connect with Like-Minded People</h3>
                <p className="text-sm text-muted-foreground">Collaborate with others who share your interests and ambitions.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Track Your Progress</h3>
                <p className="text-sm text-muted-foreground">Set goals, monitor your income, and celebrate your success with our analytics dashboard.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
