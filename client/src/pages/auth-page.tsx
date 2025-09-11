import { useState, useEffect } from "react";
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

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type VerifyOtpForm = z.infer<typeof verifyOtpSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

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

  // Forgot Password forms
  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  const verifyOtpForm = useForm<VerifyOtpForm>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email: "", otp: "" }
  });

  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "", otp: "", newPassword: "" }
  });

  // Forgot Password mutations
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "OTP sent",
        description: data.message,
      });
      setForgotPasswordStep('otp');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: VerifyOtpForm) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "OTP verified",
        description: data.message,
      });
      setForgotPasswordStep('reset');
    },
    onError: (error: any) => {
      toast({
        title: "Invalid OTP",
        description: error.message || "Please check your OTP and try again",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password reset successfully",
        description: "You can now login with your new password",
      });
      setShowForgotPassword(false);
      setForgotPasswordStep('email');
      setForgotPasswordEmail('');
      // Reset all forms
      forgotPasswordForm.reset();
      verifyOtpForm.reset();
      resetPasswordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error.message || "Please try again",
        variant: "destructive",
      });
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

  // Forgot Password handlers
  const onForgotPassword = (data: ForgotPasswordForm) => {
    setForgotPasswordEmail(data.email);
    forgotPasswordMutation.mutate(data);
  };

  const onVerifyOtp = (data: VerifyOtpForm) => {
    verifyOtpMutation.mutate(data);
  };

  const onResetPassword = (data: ResetPasswordForm) => {
    resetPasswordMutation.mutate(data);
  };

  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
    setForgotPasswordStep('email');
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
                        onClick={handleForgotPasswordClick}
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
      
      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {forgotPasswordStep === 'email' && 'Forgot Password'}
              {forgotPasswordStep === 'otp' && 'Enter OTP'}
              {forgotPasswordStep === 'reset' && 'Reset Password'}
            </DialogTitle>
            <DialogDescription>
              {forgotPasswordStep === 'email' && 'Enter your email address and we\'ll send you an OTP to reset your password.'}
              {forgotPasswordStep === 'otp' && 'Enter the 6-digit OTP code sent to your email address.'}
              {forgotPasswordStep === 'reset' && 'Enter your new password.'}
            </DialogDescription>
          </DialogHeader>
          
          {forgotPasswordStep === 'email' && (
            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  data-testid="input-forgot-email"
                  {...forgotPasswordForm.register("email")}
                />
                {forgotPasswordForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {forgotPasswordForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={forgotPasswordMutation.isPending}
                  data-testid="button-send-otp"
                >
                  {forgotPasswordMutation.isPending ? "Sending..." : "Send OTP"}
                </Button>
              </div>
            </form>
          )}

          {forgotPasswordStep === 'otp' && (
            <form onSubmit={verifyOtpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-otp">OTP Code</Label>
                <Input
                  id="verify-otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  data-testid="input-verify-otp"
                  {...verifyOtpForm.register("otp")}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    e.target.value = value;
                    verifyOtpForm.setValue("otp", value);
                    verifyOtpForm.setValue("email", forgotPasswordEmail);
                  }}
                />
                {verifyOtpForm.formState.errors.otp && (
                  <p className="text-sm text-destructive">
                    {verifyOtpForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setForgotPasswordStep('email')}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={verifyOtpMutation.isPending}
                  data-testid="button-verify-otp"
                >
                  {verifyOtpMutation.isPending ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            </form>
          )}

          {forgotPasswordStep === 'reset' && (
            <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter your new password"
                  data-testid="input-new-password"
                  {...resetPasswordForm.register("newPassword")}
                  onChange={(e) => {
                    resetPasswordForm.setValue("newPassword", e.target.value);
                    resetPasswordForm.setValue("email", forgotPasswordEmail);
                    resetPasswordForm.setValue("otp", verifyOtpForm.getValues("otp"));
                  }}
                />
                {resetPasswordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {resetPasswordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setForgotPasswordStep('otp')}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
