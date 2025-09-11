import { useState, useEffect, useReducer } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Users, Shield, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, Role, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } from "@shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// Forgot Password types
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type VerifyOtpForm = z.infer<typeof verifyOtpSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

// Forgot Password Wizard State
interface ForgotPasswordState {
  open: boolean;
  step: 'email' | 'otp' | 'reset';
  email: string;
  resetToken?: string;
  countdown: number;
  attempts: number;
  error?: string;
  isLoading: boolean;
}

type ForgotPasswordAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'BACK_TO_EMAIL' }
  | { type: 'SENT_OTP'; email: string; countdown: number }
  | { type: 'VERIFIED_OTP'; resetToken: string }
  | { type: 'RESET_DONE' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESEND' }
  | { type: 'TICK' }
  | { type: 'SET_LOADING'; loading: boolean };

const initialForgotPasswordState: ForgotPasswordState = {
  open: false,
  step: 'email',
  email: '',
  countdown: 0,
  attempts: 0,
  isLoading: false,
};

function forgotPasswordReducer(state: ForgotPasswordState, action: ForgotPasswordAction): ForgotPasswordState {
  switch (action.type) {
    case 'OPEN':
      return { ...initialForgotPasswordState, open: true };
    case 'CLOSE':
      return initialForgotPasswordState;
    case 'BACK_TO_EMAIL':
      return {
        ...state,
        step: 'email',
        error: undefined,
        isLoading: false,
      };
    case 'SENT_OTP':
      return {
        ...state,
        step: 'otp',
        email: action.email,
        countdown: action.countdown,
        attempts: 0,
        error: undefined,
        isLoading: false,
      };
    case 'VERIFIED_OTP':
      return {
        ...state,
        step: 'reset',
        resetToken: action.resetToken,
        error: undefined,
        isLoading: false,
      };
    case 'RESET_DONE':
      return initialForgotPasswordState;
    case 'ERROR':
      return {
        ...state,
        error: action.error,
        isLoading: false,
      };
    case 'RESEND':
      return {
        ...state,
        countdown: 60, // Reset countdown to 60 seconds
        attempts: state.attempts + 1,
      };
    case 'TICK':
      return {
        ...state,
        countdown: Math.max(0, state.countdown - 1),
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.loading,
      };
    default:
      return state;
  }
}

// ForgotPasswordWizard component
function ForgotPasswordWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(forgotPasswordReducer, initialForgotPasswordState);

  // Forms
  const emailForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  const otpForm = useForm<VerifyOtpForm>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email: "", otp: "" }
  });

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { resetToken: "", newPassword: "" }
  });

  // Mutations
  const sendOtpMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send OTP");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "OTP sent",
        description: data.message,
      });
      dispatch({ 
        type: 'SENT_OTP', 
        email: emailForm.getValues("email"), 
        countdown: data.resendAfterSeconds || 60 
      });
      otpForm.setValue("email", emailForm.getValues("email"));
    },
    onError: (error: any) => {
      const message = error.message || "Failed to send OTP";
      toast({
        title: "Failed to send OTP",
        description: message,
        variant: "destructive",
      });
      dispatch({ type: 'ERROR', error: message });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: VerifyOtpForm) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Invalid OTP");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "OTP verified",
        description: data.message,
      });
      dispatch({ type: 'VERIFIED_OTP', resetToken: data.resetToken });
      resetForm.setValue("resetToken", data.resetToken);
    },
    onError: (error: any) => {
      const message = error.message || "Invalid OTP";
      toast({
        title: "Invalid OTP",
        description: message,
        variant: "destructive",
      });
      dispatch({ type: 'ERROR', error: message });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reset password");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password reset successfully",
        description: "You can now login with your new password",
      });
      dispatch({ type: 'RESET_DONE' });
      onOpenChange(false); // Close the dialog
    },
    onError: (error: any) => {
      const message = error.message || "Failed to reset password";
      toast({
        title: "Failed to reset password",
        description: message,
        variant: "destructive",
      });
      dispatch({ type: 'ERROR', error: message });
    },
  });

  // Countdown timer effect
  useEffect(() => {
    if (state.countdown > 0) {
      const timer = setTimeout(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.countdown]);

  const onSendOtp = (data: ForgotPasswordForm) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    sendOtpMutation.mutate(data);
  };

  const onVerifyOtp = (data: VerifyOtpForm) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    verifyOtpMutation.mutate(data);
  };

  const onResetPassword = (data: ResetPasswordForm) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    resetPasswordMutation.mutate(data);
  };

  const handleResend = () => {
    dispatch({ type: 'RESEND' });
    onSendOtp({ email: state.email });
  };

  // Initialize state when dialog opens for the first time
  useEffect(() => {
    if (open && state.step === 'email' && !state.email && !state.isLoading) {
      dispatch({ type: 'OPEN' });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) {
        dispatch({ type: 'CLOSE' });
        // Reset all forms
        emailForm.reset();
        otpForm.reset();
        resetForm.reset();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state.step === 'email' && 'Forgot Password'}
            {state.step === 'otp' && 'Enter OTP'}
            {state.step === 'reset' && 'Reset Password'}
          </DialogTitle>
          <DialogDescription>
            {state.step === 'email' && 'Enter your email address and we\'ll send you an OTP to reset your password.'}
            {state.step === 'otp' && 'Enter the 6-digit OTP code sent to your email address.'}
            {state.step === 'reset' && 'Enter your new password.'}
          </DialogDescription>
        </DialogHeader>
        
        {state.error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {state.error}
          </div>
        )}

        {state.step === 'email' && (
          <form onSubmit={emailForm.handleSubmit(onSendOtp)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="Enter your email"
                data-testid="input-forgot-email"
                {...emailForm.register("email")}
              />
              {emailForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={state.isLoading || sendOtpMutation.isPending}
                data-testid="button-send-otp"
              >
                {state.isLoading || sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
              </Button>
            </div>
          </form>
        )}

        {state.step === 'otp' && (
          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-otp">OTP Code</Label>
              <Input
                id="verify-otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                data-testid="input-verify-otp"
                {...otpForm.register("otp")}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  e.target.value = value;
                  otpForm.setValue("otp", value);
                }}
              />
              {otpForm.formState.errors.otp && (
                <p className="text-sm text-destructive">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  dispatch({ type: 'BACK_TO_EMAIL' });
                }}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={state.isLoading || verifyOtpMutation.isPending || otpForm.getValues("otp").length !== 6}
                data-testid="button-verify-otp"
              >
                {state.isLoading || verifyOtpMutation.isPending ? "Verifying..." : "Verify OTP"}
              </Button>
            </div>
            {state.countdown > 0 ? (
              <p className="text-sm text-center text-muted-foreground">
                Resend OTP in {state.countdown} seconds
              </p>
            ) : (
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={state.isLoading || sendOtpMutation.isPending}
                  data-testid="button-resend-otp"
                >
                  Resend OTP
                </Button>
              </div>
            )}
          </form>
        )}

        {state.step === 'reset' && (
          <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter your new password"
                data-testid="input-new-password"
                {...resetForm.register("newPassword")}
              />
              {resetForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {resetForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => dispatch({ type: 'SENT_OTP', email: state.email, countdown: 0 })}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={state.isLoading || resetPasswordMutation.isPending}
                data-testid="button-reset-password"
              >
                {state.isLoading || resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      studentId: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });





  // Fast redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectPath = user.role === "ADMIN" ? "/admin" : 
                          user.role === "LIBRARIAN" ? "/librarian" : "/";
      setLocation(redirectPath);
    }
  }, [user, setLocation]);


  // Don't render if user is already logged in
  if (user) {
    return null;
  }

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
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
            <h2 className="text-2xl sm:text-3xl modern-heading">Library Assist</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">Comprehensive Library Management System</p>
          </div>

          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign in to your account</CardTitle>
                  <CardDescription>
                    Enter your credentials to access the library system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Enter your username"
                        data-testid="input-login-username"
                        {...loginForm.register("username")}
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          data-testid="input-login-password"
                          {...loginForm.register("password")}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          data-testid="button-toggle-login-password"
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showLoginPassword ? "Hide password" : "Show password"}
                          </span>
                        </Button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        data-testid="checkbox-remember-me"
                      />
                      <Label htmlFor="remember-me" className="text-sm">
                        Remember me
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      variant="gradient"
                      size="lg"
                      disabled={loginMutation.isPending}
                      data-testid="button-login-submit"
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                    
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                        data-testid="button-forgot-password"
                      >
                        Forgot Password?
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Join Library Assist to start borrowing books
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-fullName">Full Name</Label>
                      <Input
                        id="register-fullName"
                        type="text"
                        placeholder="Enter your full name"
                        data-testid="input-register-fullname"
                        {...registerForm.register("fullName")}
                      />
                      {registerForm.formState.errors.fullName && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Choose a username"
                        data-testid="input-register-username"
                        {...registerForm.register("username")}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email Address</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        data-testid="input-register-email"
                        {...registerForm.register("email")}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-studentId">Student ID</Label>
                      <Input
                        id="register-studentId"
                        type="text"
                        placeholder="Enter your student ID"
                        data-testid="input-register-student-id"
                        {...registerForm.register("studentId")}
                      />
                      {registerForm.formState.errors.studentId && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.studentId.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-phone">Phone Number</Label>
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        data-testid="input-register-phone"
                        {...registerForm.register("phone")}
                      />
                      {registerForm.formState.errors.phone && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="Create a password"
                          data-testid="input-register-password"
                          {...registerForm.register("password")}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          data-testid="button-toggle-register-password"
                        >
                          {showRegisterPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showRegisterPassword ? "Hide password" : "Show password"}
                          </span>
                        </Button>
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="register-confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          data-testid="input-register-confirm-password"
                          {...registerForm.register("confirmPassword")}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showConfirmPassword ? "Hide password" : "Show password"}
                          </span>
                        </Button>
                      </div>
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      variant="gradient"
                      size="lg"
                      disabled={registerMutation.isPending}
                      data-testid="button-register-submit"
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:block lg:flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
        <img
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800"
          alt="Modern library interior with students studying"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <h1 className="text-4xl font-bold mb-4">Welcome to Library Assist</h1>
            <p className="text-xl mb-6">Your comprehensive library management solution</p>
            <div className="grid grid-cols-1 gap-4 max-w-md">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-6 w-6" />
                <span>Browse and borrow books easily</span>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6" />
                <span>Manage library operations</span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6" />
                <span>Role-based access control</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Forgot Password Wizard */}
      <ForgotPasswordWizard 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
      
    </div>
  );
}
