import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, Shield, RefreshCcw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyOtpSchema, VerifyOtpRequest } from "@shared/schema";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VerifyOtpPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(0);

  // Extract email from URL params
  const searchParams = new URLSearchParams(search);
  const email = searchParams.get("email") || "";

  // Redirect to forgot password if no email provided
  useEffect(() => {
    if (!email) {
      toast({
        title: "Missing Email",
        description: "Please start from the forgot password page.",
        variant: "destructive",
      });
      setLocation("/forgot-password");
    }
  }, [email, setLocation, toast]);

  // Countdown timer for resend functionality
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const form = useForm<VerifyOtpRequest>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email,
      otp: "",
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: VerifyOtpRequest) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "OTP Verified Successfully",
        description: "You can now reset your password.",
      });
      // Navigate to password reset with token
      setLocation(`/reset-password?token=${encodeURIComponent(data.resetToken)}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid OTP",
        description: error.message,
        variant: "destructive",
      });
      // Clear the OTP field on error
      form.setValue("otp", "");
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email.",
      });
      setCountdown(60); // 60 second cooldown
      form.setValue("otp", ""); // Clear current OTP
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Resend OTP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VerifyOtpRequest) => {
    verifyOtpMutation.mutate({ ...data, email });
  };

  const goBackToForgotPassword = () => {
    setLocation("/forgot-password");
  };

  const handleResendOtp = () => {
    if (countdown === 0) {
      resendOtpMutation.mutate();
    }
  };

  // Format OTP input to only accept numbers and limit to 6 digits
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    form.setValue("otp", value);
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

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
            <h2 className="text-2xl sm:text-3xl modern-heading">Verify OTP</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Email Verification</span>
              </CardTitle>
              <CardDescription>
                We sent a verification code to{" "}
                <span className="font-medium text-foreground" data-testid="text-email-display">
                  {email}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                    data-testid="input-otp-code"
                    value={form.watch("otp")}
                    onChange={handleOtpChange}
                  />
                  {form.formState.errors.otp && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.otp.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="gradient"
                  size="lg"
                  disabled={verifyOtpMutation.isPending || form.watch("otp").length !== 6}
                  data-testid="button-verify-otp"
                >
                  {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
                </Button>

                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm text-muted-foreground">Didn't receive the code?</span>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || resendOtpMutation.isPending}
                    data-testid="button-resend-otp"
                  >
                    <RefreshCcw className="h-4 w-4 mr-1" />
                    {countdown > 0 
                      ? `Resend in ${countdown}s` 
                      : resendOtpMutation.isPending 
                      ? "Sending..."
                      : "Resend Code"
                    }
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={goBackToForgotPassword}
                  data-testid="button-back-to-forgot-password"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Email Entry
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Check your spam folder if you don't see the email in your inbox.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:block lg:flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
        <img
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800"
          alt="Secure library access with digital verification"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <h1 className="text-4xl font-bold mb-4">Secure Verification</h1>
            <p className="text-xl mb-6">Protecting your library account</p>
            <div className="grid grid-cols-1 gap-4 max-w-md">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6" />
                <span>6-digit security code</span>
              </div>
              <div className="flex items-center space-x-3">
                <RefreshCcw className="h-6 w-6" />
                <span>Resend functionality</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}