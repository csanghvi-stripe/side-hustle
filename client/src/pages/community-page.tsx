import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, UserPlus, Users, Star, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@shared/schema';

// User card component
const UserCard = ({ 
  user, 
  onConnect,
  isConnecting = false,
  isAlreadyConnected = false
}: { 
  user: UserProfile; 
  onConnect: () => void;
  isConnecting?: boolean;
  isAlreadyConnected?: boolean;
}) => {
  const skillsToShow = user.skills?.slice(0, 3) || [];
  const remainingSkillsCount = user.skills ? Math.max(0, user.skills.length - 3) : 0;
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profilePicture || ''} alt={user.displayName || user.username} />
              <AvatarFallback>{user.displayName?.[0] || user.username[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{user.displayName || user.username}</CardTitle>
              <CardDescription className="text-xs">@{user.username}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="text-xs font-medium">4.8</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {user.bio || "No bio provided"}
        </p>
        
        <div className="flex flex-wrap gap-1.5 mb-3">
          {skillsToShow.map((skill, index) => (
            <Badge variant="secondary" key={index} className="text-xs font-normal">
              {skill}
            </Badge>
          ))}
          {remainingSkillsCount > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{remainingSkillsCount} more
            </Badge>
          )}
        </div>
        
        <div className="flex items-center text-xs text-muted-foreground">
          <span className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            <span>42 connections</span>
          </span>
          <span className="mx-2">•</span>
          <span>Joined Apr 2025</span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-4">
        <div className="flex space-x-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            asChild
          >
            <a href={`/messages/new?recipient=${user.id}`}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </a>
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={onConnect}
            disabled={isConnecting || isAlreadyConnected}
          >
            {isAlreadyConnected ? (
              'Connected'
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                {isConnecting ? 'Connecting...' : 'Connect'}
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const CommunityPage = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');
  
  // Mock users - in a real app, this would be fetched from an API
  const mockUsers: UserProfile[] = [
    {
      id: 101,
      username: "designwhiz",
      displayName: "Emma Rodriguez",
      profilePicture: "https://i.pravatar.cc/150?img=1",
      bio: "UI/UX designer with 5+ years experience. Passionate about creating intuitive digital experiences.",
      skills: ["UI Design", "UX Research", "Figma", "Prototyping"],
      discoverable: true,
      allowMessages: true,
    },
    {
      id: 102,
      username: "codecraft",
      displayName: "Jason Thomson",
      profilePicture: "https://i.pravatar.cc/150?img=2",
      bio: "Full-stack developer building web and mobile apps. React & Node.js specialist.",
      skills: ["React", "Node.js", "JavaScript", "TypeScript", "MongoDB"],
      discoverable: true,
      allowMessages: true,
    },
    {
      id: 103,
      username: "contentcreator",
      displayName: "Sophia Chen",
      profilePicture: "https://i.pravatar.cc/150?img=3",
      bio: "Content creator and digital marketer helping brands tell their stories online.",
      skills: ["Content Writing", "SEO", "Social Media", "Email Marketing", "Content Strategy"],
      discoverable: true,
      allowMessages: true,
    },
    {
      id: 104,
      username: "productguru",
      displayName: "David Okafor",
      profilePicture: "https://i.pravatar.cc/150?img=4",
      bio: "Product manager with expertise in SaaS and consumer apps. Love turning ideas into reality.",
      skills: ["Product Strategy", "User Research", "Agile", "Data Analysis"],
      discoverable: true,
      allowMessages: true,
    },
    {
      id: 105,
      username: "videomaker",
      displayName: "Priya Sharma",
      profilePicture: "https://i.pravatar.cc/150?img=5",
      bio: "Video editor and motion graphics designer creating content for YouTube and social media.",
      skills: ["Video Editing", "After Effects", "Premiere Pro", "Animation", "Storyboarding"],
      discoverable: true,
      allowMessages: true,
    },
    {
      id: 106,
      username: "ecommercepro",
      displayName: "Michael Stevens",
      profilePicture: "https://i.pravatar.cc/150?img=6",
      bio: "E-commerce specialist with experience scaling online stores from 0 to $1M+.",
      skills: ["Shopify", "E-commerce", "Digital Marketing", "CRO", "PPC"],
      discoverable: true,
      allowMessages: true,
    }
  ];
  
  // Mock connection status for demo purposes
  const [pendingConnections, setPendingConnections] = useState<number[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<number[]>([]);
  
  // Mock connection mutation
  const connectMutation = useMutation({
    mutationFn: async (userId: number) => {
      // Simulate API call
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setPendingConnections((prev) => [...prev, userId]);
          resolve();
        }, 1000);
      });
    },
    onSuccess: (_, userId) => {
      toast({
        title: "Connection request sent",
        description: "The user will be notified of your connection request.",
      });
      
      // For demo purposes, auto-accept after a delay
      setTimeout(() => {
        setPendingConnections((prev) => prev.filter((id) => id !== userId));
        setConnectedUsers((prev) => [...prev, userId]);
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "Unable to send connection request. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleConnect = (userId: number) => {
    connectMutation.mutate(userId);
  };
  
  const filteredUsers = mockUsers.filter((user) => {
    // Apply search query filter
    const matchesSearch = searchQuery === '' || 
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Apply skill filter
    const matchesSkill = skillFilter === 'all' || 
      user.skills?.some(skill => skill.toLowerCase() === skillFilter.toLowerCase());
    
    return matchesSearch && matchesSkill;
  });

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Community</h1>
        <p className="text-muted-foreground">
          Connect with other side hustlers, find potential collaborators, and grow your network
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, username, skills, or bio..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              <SelectItem value="ui design">UI Design</SelectItem>
              <SelectItem value="ux research">UX Research</SelectItem>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="node.js">Node.js</SelectItem>
              <SelectItem value="content writing">Content Writing</SelectItem>
              <SelectItem value="video editing">Video Editing</SelectItem>
              <SelectItem value="e-commerce">E-commerce</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs defaultValue="discover" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="connections">My Connections</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        
        <TabsContent value="discover">
          {filteredUsers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => (
                <UserCard 
                  key={user.id}
                  user={user}
                  onConnect={() => handleConnect(user.id)}
                  isConnecting={pendingConnections.includes(user.id)}
                  isAlreadyConnected={connectedUsers.includes(user.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found matching your search criteria.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="connections">
          {connectedUsers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mockUsers
                .filter(user => connectedUsers.includes(user.id))
                .map((user) => (
                  <UserCard 
                    key={user.id}
                    user={user}
                    onConnect={() => {}}
                    isAlreadyConnected={true}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No connections yet</h3>
              <p className="text-muted-foreground mb-6">
                Connect with other users to start building your network
              </p>
              <Button variant="outline" onClick={() => document.querySelector('[data-value="discover"]')?.click()}>
                Discover Users
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pending">
          {pendingConnections.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mockUsers
                .filter(user => pendingConnections.includes(user.id))
                .map((user) => (
                  <UserCard 
                    key={user.id}
                    user={user}
                    onConnect={() => {}}
                    isConnecting={true}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No pending requests</h3>
              <p className="text-muted-foreground">
                You don't have any pending connection requests
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunityPage;