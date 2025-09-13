import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordRequest } from "@shared/schema";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordRequest) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "OTP Sent Successfully",
        description: "Please check your email for the verification code.",
      });
      // Navigate to OTP verification with email as state
      setLocation(`/verify-otp?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send OTP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordRequest) => {
    forgotPasswordMutation.mutate(data);
  };

  const goBackToLogin = () => {
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen flex ios-safe-area-top ios-safe-area-bottom">
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 lg:px-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl modern-heading">Forgot Password</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Enter your email address to receive a verification code
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Reset Your Password</span>
              </CardTitle>
              <CardDescription>
                We'll send you a 6-digit verification code to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    data-testid="input-forgot-password-email"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="gradient"
                  size="lg"
                  disabled={forgotPasswordMutation.isPending}
                  data-testid="button-send-otp"
                >
                  {forgotPasswordMutation.isPending ? "Sending..." : "Send Verification Code"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={goBackToLogin}
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={goBackToLogin}
                data-testid="link-back-to-login"
              >
                Sign in here
              </Button>
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:block lg:flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
        <img
          src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800"
          alt="Modern library with books and reading area"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <h1 className="text-4xl font-bold mb-4">Password Recovery</h1>
            <p className="text-xl mb-6">Secure and quick access restoration</p>
            <div className="grid grid-cols-1 gap-4 max-w-md">
              <div className="flex items-center space-x-3">
                <Mail className="h-6 w-6" />
                <span>Email-based verification</span>
              </div>
              <div className="flex items-center space-x-3">
                <BookOpen className="h-6 w-6" />
                <span>Quick access to your library account</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}