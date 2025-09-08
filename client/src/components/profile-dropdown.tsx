import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, BookOpen, Heart, LogOut, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";

export function ProfileDropdown() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return 'Student';
      case 'LIBRARIAN':
        return 'Librarian';
      case 'ADMIN':
        return 'Admin';
      default:
        return role;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center h-auto p-2 hover:bg-muted/50"
            data-testid="profile-dropdown-trigger"
          >
            <Avatar className="h-8 w-8">
              {user.profilePicture && (
                <AvatarImage 
                  src={user.profilePicture} 
                  alt={user.fullName}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-medium">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none" data-testid="dropdown-user-name">
                {user.fullName}
              </p>
              <p className="text-xs leading-none text-muted-foreground" data-testid="dropdown-username">
                @{user.username}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setLocation(user.role === 'LIBRARIAN' ? '/librarian/profile' : '/student/profile')}
            data-testid="dropdown-profile"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowLogoutDialog(true)}
            className="text-red-600 focus:text-red-600"
            data-testid="dropdown-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent data-testid="dialog-logout-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="title-logout-confirmation">
              Are you sure you want to logout?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="description-logout-confirmation">
              You will be logged out of your account and redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setShowLogoutDialog(false)}
              data-testid="button-cancel-logout"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLogoutDialog(false);
                logoutMutation.mutate();
              }}
              data-testid="button-confirm-logout"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}