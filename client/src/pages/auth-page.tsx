import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, login, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setLocation("/");
      return;
    }

    const handleAuth = async () => {
      try {
        await login();
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        setLocation("/");
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to authenticate. Please try again.",
        });
      }
    };

    handleAuth();
  }, [user, login, setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <h1 className="mt-4 text-xl font-semibold">Authenticating...</h1>
      </div>
    </div>
  );
}