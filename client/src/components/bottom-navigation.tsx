import { Home, BookOpen, User, Search, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  userRole?: string;
}

export function BottomNavigation({ userRole }: BottomNavigationProps) {
  const [location, setLocation] = useLocation();
  
  const navItems = userRole === 'librarian' ? [
    {
      icon: Home,
      label: "Dashboard",
      path: "/librarian",
      isActive: location === "/librarian"
    },
    {
      icon: Search,
      label: "Search",
      path: "/librarian/search",
      isActive: location === "/librarian/search"
    },
    {
      icon: BookOpen,
      label: "Books",
      path: "/librarian/books",
      isActive: location === "/librarian/books"
    },
    {
      icon: User,
      label: "Profile",
      path: "/librarian/profile",
      isActive: location === "/librarian/profile"
    }
  ] : [
    {
      icon: Home,
      label: "Home",
      path: "/student",
      isActive: location === "/student"
    },
    {
      icon: BookOpen,
      label: "Books",
      path: "/student/books",
      isActive: location === "/student/books"
    },
    {
      icon: Heart,
      label: "Favorites",
      path: "/student/favorites", 
      isActive: location === "/student/favorites"
    },
    {
      icon: User,
      label: "Profile",
      path: "/student/profile",
      isActive: location === "/student/profile"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 block md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors",
                item.isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}