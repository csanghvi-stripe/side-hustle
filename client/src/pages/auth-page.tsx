
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { loginMutation, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setLocation("/");
      return;
    }

    const handleAuth = async () => {
      try {
        const result = await loginMutation.mutateAsync({
          username: "",
          password: ""
        });
        if (result) {
          toast({
            title: "Welcome back!",
            description: "Successfully logged in.",
          });
          setLocation("/");
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to authenticate. Please try again.",
        });
      }
    };

    handleAuth();
  }, [user, loginMutation, setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <h1 className="mt-4 text-xl font-semibold">Authenticating...</h1>
      </div>
    </div>
  );
}
