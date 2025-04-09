import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Message } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Search, Send, User, MessageSquare, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function InboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const res = await apiRequest("POST", `/api/messages/${messageId}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark message as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, content, subject }: { recipientId: number, content: string, subject?: string }) => {
      const res = await apiRequest("POST", "/api/messages", {
        recipientId,
        content,
        subject: subject || `Re: ${replyTo?.subject || 'Your message'}`,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setReplyContent("");
      setReplyTo(null);
      setIsDialogOpen(false);
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReply = () => {
    if (!replyTo || !replyContent.trim()) return;
    
    sendMessageMutation.mutate({
      recipientId: replyTo.senderId,
      content: replyContent,
    });
  };

  const handleMarkAsRead = (messageId: number) => {
    markAsReadMutation.mutate(messageId);
  };

  const filteredMessages = messages?.filter(message => {
    const query = searchQuery.toLowerCase();
    return (
      message.senderName.toLowerCase().includes(query) ||
      (message.subject?.toLowerCase().includes(query) || false) ||
      message.content.toLowerCase().includes(query)
    );
  });

  const inboxMessages = filteredMessages?.filter(message => 
    user && message.recipientId === user.id
  ) || [];

  const sentMessages = filteredMessages?.filter(message => 
    user && message.senderId === user.id
  ) || [];

  const unreadMessages = inboxMessages.filter(message => !message.isRead);

  const renderMessageList = (messageList: Message[], showRead: boolean = true) => {
    if (messageList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No messages</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === "inbox" ? "Your inbox is empty." : "You haven't sent any messages yet."}
          </p>
        </div>
      );
    }

    return messageList.map(message => (
      <Card key={message.id} className={`mb-4 ${!message.isRead && showRead ? 'border-primary' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="bg-muted rounded-full p-2">
                <User className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">{activeTab === "inbox" ? message.senderName : message.senderName}</CardTitle>
                <CardDescription className="text-xs">
                  {message.sentAt 
                    ? typeof message.sentAt === 'string' 
                      ? format(parseISO(message.sentAt), 'MMM dd, yyyy • h:mm a') 
                      : format(new Date(message.sentAt), 'MMM dd, yyyy • h:mm a') 
                    : 'Date not available'}
                </CardDescription>
              </div>
            </div>
            {!message.isRead && showRead && (
              <Badge variant="default" className="bg-primary">New</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {message.subject && (
            <h4 className="font-medium mb-1">{message.subject}</h4>
          )}
          <p className="text-sm">{message.content}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-2">
          {!message.isRead && showRead && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleMarkAsRead(message.id)}
              disabled={markAsReadMutation.isPending}
            >
              {markAsReadMutation.isPending && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Mark as Read
            </Button>
          )}
          {activeTab === "inbox" && (
            <Button 
              size="sm" 
              onClick={() => {
                setReplyTo(message);
                setIsDialogOpen(true);
              }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Reply
            </Button>
          )}
        </CardFooter>
      </Card>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/4 space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => setActiveTab("inbox")}>
                  <Mail className="h-4 w-4" />
                  <span>Inbox</span>
                  {unreadMessages.length > 0 && (
                    <Badge className="ml-auto" variant="default">{unreadMessages.length}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => setActiveTab("sent")}>
                  <Send className="h-4 w-4" />
                  <span>Sent</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">Message Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>Total</span>
                  </div>
                  <span className="font-medium">{messages?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span>Unread</span>
                  </div>
                  <span className="font-medium">{unreadMessages.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span>Read</span>
                  </div>
                  <span className="font-medium">{inboxMessages.length - unreadMessages.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="w-full md:w-3/4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
              </TabsList>
              
              <TabsContent value="inbox" className="space-y-4">
                {renderMessageList(inboxMessages)}
              </TabsContent>
              
              <TabsContent value="sent" className="space-y-4">
                {renderMessageList(sentMessages, false)}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Reply to {replyTo?.senderName}</DialogTitle>
              <DialogDescription>
                Send a message in response to: {replyTo?.subject || 'No subject'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Write your reply here..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleReply}
                disabled={!replyContent.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Reply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}