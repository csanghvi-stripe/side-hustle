import React from "react";
import { UserMatch } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface UserMatchCardProps {
  match: UserMatch;
}

const UserMatchCard: React.FC<UserMatchCardProps> = ({ match }) => {
  const { user, matchScore, matchedSkills } = match;
  
  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const displayName = user.displayName || user.username;
  const initials = getInitials(displayName);

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white flex flex-col h-full">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          {user.profilePicture && <AvatarImage src={user.profilePicture} alt={displayName} />}
          <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">{displayName}</h3>
            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">
              {matchScore}% Match
            </Badge>
          </div>
          
          {user.bio && (
            <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{user.bio}</p>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <h4 className="text-sm font-medium text-neutral-700 mb-2">Shared Skills</h4>
        <div className="flex flex-wrap gap-1">
          {matchedSkills.map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      </div>
      
      {user.allowMessages && (
        <div className="mt-auto pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
          >
            <svg
              className="h-4 w-4 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Message
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserMatchCard;