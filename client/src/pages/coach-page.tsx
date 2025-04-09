import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, SendIcon, PlusCircle, StarIcon, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChatConversation, ChatMessage } from "@shared/schema";

interface Conversation {
  id: number;
  title: string;
  updatedAt: Date;
  isArchived: boolean;
}

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Subscription info interface
interface SubscriptionInfo {
  status: string;
  tier: string;
  credits: number;
  expiresAt: Date | null;
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric'
  }).format(new Date(date));
}

// ChatMessage component
const ChatMessageItem = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[80%]`}>
        <Avatar className="h-8 w-8 mt-1">
          {isUser ? (
            <AvatarFallback>U</AvatarFallback>
          ) : (
            <>
              <AvatarImage src="/coach-avatar.png" />
              <AvatarFallback>AI</AvatarFallback>
            </>
          )}
        </Avatar>
        <div>
          <div 
            className={`px-4 py-2 rounded-lg ${
              isUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Loading placeholder for the chat
const ChatLoadingPlaceholder = () => (
  <div className="flex justify-start mb-4">
    <div className="flex flex-row items-start gap-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="px-4 py-2 rounded-lg bg-muted">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 bg-gray-300 rounded-full animate-pulse"></div>
          <div className="h-3 w-3 bg-gray-300 rounded-full animate-pulse delay-75"></div>
          <div className="h-3 w-3 bg-gray-300 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  </div>
);

// ChatWindow component
const ChatWindow = ({ 
  conversationId, 
  messages, 
  isLoading, 
  isPending,
  onSendMessage 
}: { 
  conversationId: number | null;
  messages: Message[];
  isLoading: boolean;
  isPending: boolean;
  onSendMessage: (message: string) => void;
}) => {
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);
  
  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText("");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="max-w-md">
          <h3 className="text-2xl font-semibold mb-4">Career AI Coach</h3>
          <p className="text-muted-foreground mb-6">
            Start a new conversation to get personalized career advice, monetization strategies, and guidance on your side hustle journey.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessageItem key={message.id} message={message} />
            ))}
            {isPending && <ChatLoadingPlaceholder />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your career coach anything..."
            className="resize-none min-h-[60px]"
            disabled={isLoading || isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isLoading || isPending}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ConversationSidebar component
const ConversationSidebar = ({ 
  conversations,
  activeConversation,
  onSelectConversation,
  onNewConversation,
  subscriptionInfo,
  isCreatingConversation
}: { 
  conversations: Conversation[];
  activeConversation: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  subscriptionInfo: SubscriptionInfo | null;
  isCreatingConversation: boolean;
}) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b">
        <Button 
          className="w-full flex items-center justify-center gap-2" 
          onClick={onNewConversation}
          disabled={isCreatingConversation}
        >
          {isCreatingConversation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          New Conversation
        </Button>
      </div>
      
      {subscriptionInfo && (
        <div className="px-4 py-3 bg-muted/50">
          <div className="flex justify-between items-center">
            <Badge variant={subscriptionInfo.tier === 'free' ? 'outline' : 'default'}>
              {subscriptionInfo.tier === 'free' ? 'Free' : subscriptionInfo.tier}
            </Badge>
            <div className="text-sm font-medium">
              {subscriptionInfo.credits} credits
            </div>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <Button
                key={conversation.id}
                variant={activeConversation === conversation.id ? "secondary" : "ghost"}
                className="w-full justify-start h-auto py-3 px-4"
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div>
                  <div className="font-medium truncate text-left">{conversation.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(conversation.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

import PromoCodeForm from '@/components/coach/PromoCodeForm';

// SubscriptionRequired component
const SubscriptionRequired = () => {
  const { toast } = useToast();
  const [showPromoForm, setShowPromoForm] = useState(false);

  const handlePromoSuccess = (credits: number) => {
    toast({
      title: "Credits Added!",
      description: `${credits} credits have been added to your account. Refresh the page to start using the AI Coach.`,
    });
    
    // Refresh subscription info
    queryClient.invalidateQueries({ queryKey: ['/api/coach/subscription-info'] });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="mb-6">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
      </div>
      <div className="max-w-md">
        <h3 className="text-2xl font-semibold mb-2">Premium Feature</h3>
        <p className="text-muted-foreground mb-6">
          The AI Career Coach is available exclusively to premium subscribers. Upgrade your plan to access personalized career guidance.
        </p>
        
        {showPromoForm ? (
          <div className="my-6">
            <PromoCodeForm onSuccess={handlePromoSuccess} />
            <Button 
              variant="link" 
              className="mt-4"
              onClick={() => setShowPromoForm(false)}
            >
              Go back
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              className="min-w-[200px]"
              onClick={() => window.location.href = '/subscription'}
            >
              Upgrade Now
            </Button>
            <div>
              <Button 
                variant="outline" 
                className="min-w-[200px]"
                onClick={() => setShowPromoForm(true)}
              >
                I Have a Promo Code
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Coach Page component
export default function CoachPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [showPromoForm, setShowPromoForm] = useState(false);
  
  // Get subscription info
  const { data: subscriptionInfo, isLoading: isLoadingSubscription } = useQuery<SubscriptionInfo>({
    queryKey: ['/api/coach/subscription-info'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/coach/subscription-info');
      if (!res.ok) throw new Error('Failed to fetch subscription info');
      return res.json();
    }
  });
  
  // Check if the user has access to the coach feature
  const hasCoachAccess = subscriptionInfo && 
    (subscriptionInfo.status === 'active' || subscriptionInfo.credits > 0);
  
  // Get conversations
  const { 
    data: conversations = [], 
    isLoading: isLoadingConversations 
  } = useQuery<Conversation[]>({
    queryKey: ['/api/coach/conversations'],
    queryFn: async () => {
      if (!hasCoachAccess) return [];
      const res = await apiRequest('GET', '/api/coach/conversations');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    },
    enabled: !!hasCoachAccess
  });
  
  // Get messages for the active conversation
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages 
  } = useQuery<Message[]>({
    queryKey: ['/api/coach/conversations', activeConversation, 'messages'],
    queryFn: async () => {
      if (!activeConversation) return [];
      const res = await apiRequest('GET', `/api/coach/conversations/${activeConversation}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!activeConversation && !!hasCoachAccess
  });
  
  // Create new conversation
  const newConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/coach/conversations', {
        title: 'New Conversation',
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/coach/conversations'] });
      setActiveConversation(data.id);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Could not create conversation: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeConversation) throw new Error('No active conversation');
      
      const res = await apiRequest('POST', `/api/coach/conversations/${activeConversation}/messages`, {
        content,
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/coach/conversations', activeConversation, 'messages'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/coach/subscription-info'] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Could not send message: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const handleNewConversation = () => {
    newConversationMutation.mutate();
  };
  
  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };
  
  const isLoading = isLoadingSubscription || 
    (hasCoachAccess && (isLoadingConversations || (activeConversation && isLoadingMessages)));
  
  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">AI Career Coach</h1>
          <p className="text-muted-foreground">
            Get personalized career advice and monetization strategies from your AI coach
          </p>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-16rem)]">
          {/* Sidebar */}
          <div className="md:col-span-1 border rounded-lg overflow-hidden">
            {hasCoachAccess ? (
              <ConversationSidebar 
                conversations={conversations}
                activeConversation={activeConversation}
                onSelectConversation={setActiveConversation}
                onNewConversation={handleNewConversation}
                subscriptionInfo={subscriptionInfo}
                isCreatingConversation={newConversationMutation.isPending}
              />
            ) : (
              <div className="p-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Premium Feature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Access personalized AI coaching by upgrading to a premium plan
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button 
                      className="w-full"
                      onClick={() => window.location.href = '/subscription'}
                    >
                      Upgrade Now
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowPromoForm(true)}
                    >
                      I Have a Promo Code
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
          
          {/* Chat area */}
          <div className="md:col-span-3 border rounded-lg overflow-hidden">
            {hasCoachAccess ? (
              <ChatWindow 
                conversationId={activeConversation}
                messages={messages}
                isLoading={isLoading === true}
                isPending={sendMessageMutation.isPending}
                onSendMessage={handleSendMessage}
              />
            ) : (
              <SubscriptionRequired />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}