import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Mail, Settings, User, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AppHeader() {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Fetch unread message count - this would be replaced with a real API call
  useEffect(() => {
    // For demonstration purposes only - would be replaced with a real API call
    if (user) {
      setUnreadMessages(3); // Example value
    }
  }, [user]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const menuItems = [
    { name: "Discover", path: "/" },
    { name: "Community", path: "/community" },
    { name: "Resources", path: "/resources" },
    { name: "My Opportunities", path: "/saved-opportunities" },
    { name: "Analytics", path: "/analytics" },
    { name: "Skills Assessment", path: "/skills-assessment" },
    { name: "Pricing Calculator", path: "/pricing-calculator" },
    { name: "AI Coach", path: "/coach" },
  ];

  const renderMobileMenu = () => {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <div className="flex flex-col space-y-4 mt-8">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant={(location === item.path || (item.path === "/" && location === "")) ? "default" : "ghost"}
                className="justify-start"
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
              >
                {item.name}
              </Button>
            ))}
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                className="justify-start w-full"
                onClick={() => {
                  navigate("/inbox");
                  setIsOpen(false);
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Inbox
                {unreadMessages > 0 && (
                  <Badge variant="default" className="ml-2">
                    {unreadMessages}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                className="justify-start w-full"
                onClick={() => {
                  navigate("/settings");
                  setIsOpen(false);
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button
                variant="ghost"
                className="justify-start w-full"
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center mr-6">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
              SideHustle
            </span>
          </Link>

          {/* Desktop Navigation Menu - Only shown when logged in */}
          {user && (
            <nav className="hidden md:flex items-center space-x-4">
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  variant={(location === item.path || (item.path === "/" && location === "")) ? "default" : "ghost"}
                  asChild
                >
                  <Link href={item.path}>{item.name}</Link>
                </Button>
              ))}
            </nav>
          )}
        </div>

        {user ? (
          <div className="flex items-center space-x-4">
            {!isMobile && (
              <>
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/inbox">
                    <div className="relative">
                      <Mail className="h-5 w-5" />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                          {unreadMessages}
                        </span>
                      )}
                    </div>
                  </Link>
                </Button>
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/avatar.jpg" alt={user.username} />
                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/inbox")}>
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Inbox</span>
                  {unreadMessages > 0 && (
                    <Badge variant="default" className="ml-auto">
                      {unreadMessages}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user && renderMobileMenu()}
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth?tab=register">Get Started</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}