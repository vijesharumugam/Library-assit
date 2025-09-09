import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { subscribe, isSupported, permission } = usePushNotifications();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: (failureCount, error: any) => {
      // Don't retry on network errors in production
      if (import.meta.env.PROD && failureCount >= 1) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 2000,
  });

  // Auto-request notification permission for students and librarians on login
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (user && (user.role === "STUDENT" || user.role === "LIBRARIAN")) {
        if (isSupported && permission === "default") {
          try {
            // Show a friendly message before requesting permission
            toast({
              title: "Enable Notifications",
              description: "Get notified about library updates, due dates, and important messages",
            });
            
            // Wait a moment for the toast to show, then request permission
            setTimeout(async () => {
              await subscribe();
            }, 1500);
          } catch (error) {
            console.log("Failed to request notification permission:", error);
          }
        }
      }
    };

    requestNotificationPermission();
  }, [user, isSupported, permission, subscribe, toast]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Auto-request notification permission for students and librarians on successful login
      if ((user.role === "STUDENT" || user.role === "LIBRARIAN") && isSupported && permission === "default") {
        try {
          // Show a friendly message before requesting permission
          toast({
            title: "Enable Notifications",
            description: "Get notified about library updates, due dates, and important messages",
          });
          
          // Wait a moment for the toast to show, then request permission
          setTimeout(async () => {
            await subscribe();
          }, 1500);
        } catch (error) {
          console.log("Failed to request notification permission:", error);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: async (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Auto-request notification permission for students and librarians on successful registration
      if ((user.role === "STUDENT" || user.role === "LIBRARIAN") && isSupported && permission === "default") {
        try {
          // Show a friendly message before requesting permission
          toast({
            title: "Welcome! Enable Notifications",
            description: "Get notified about library updates, due dates, and important messages",
          });
          
          // Wait a moment for the toast to show, then request permission
          setTimeout(async () => {
            await subscribe();
          }, 1500);
        } catch (error) {
          console.log("Failed to request notification permission:", error);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
