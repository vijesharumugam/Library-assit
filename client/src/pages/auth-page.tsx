import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Users, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, Role } from "@shared/schema";
import { z } from "zod";
import { Redirect } from "wouter";

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

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect if already logged in
  if (user) {
    const redirectPath = user.role === "ADMIN" ? "/admin" : 
                        user.role === "LIBRARIAN" ? "/librarian" : "/";
    return <Redirect to={redirectPath} />;
  }

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
      password: "",
      confirmPassword: "",
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };

  const loginAsDemo = (role: "student" | "librarian" | "admin") => {
    const demoCredentials = {
      student: { username: "student", password: "student123" },
      librarian: { username: "librarian", password: "librarian123" },
      admin: { username: "admin", password: "admin123" },
    };
    
    loginMutation.mutate(demoCredentials[role]);
  };

  return (
    <div className="min-h-screen flex">
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Library Assist</h2>
            <p className="mt-2 text-muted-foreground">Comprehensive Library Management System</p>
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
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        data-testid="input-login-password"
                        {...loginForm.register("password")}
                      />
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
                      disabled={loginMutation.isPending}
                      data-testid="button-login-submit"
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
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
                      <Label htmlFor="register-studentId">Student ID (Optional)</Label>
                      <Input
                        id="register-studentId"
                        type="text"
                        placeholder="Enter your student ID"
                        data-testid="input-register-student-id"
                        {...registerForm.register("studentId")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        data-testid="input-register-password"
                        {...registerForm.register("password")}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirmPassword">Confirm Password</Label>
                      <Input
                        id="register-confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        data-testid="input-register-confirm-password"
                        {...registerForm.register("confirmPassword")}
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
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

          {/* Demo Access Section */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Demo Access</CardTitle>
              <CardDescription>Try different user roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsDemo("student")}
                  disabled={loginMutation.isPending}
                  data-testid="button-demo-student"
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <Users className="h-4 w-4 mb-1" />
                  <span className="text-xs">Student</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsDemo("librarian")}
                  disabled={loginMutation.isPending}
                  data-testid="button-demo-librarian"
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <BookOpen className="h-4 w-4 mb-1" />
                  <span className="text-xs">Librarian</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsDemo("admin")}
                  disabled={loginMutation.isPending}
                  data-testid="button-demo-admin"
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <Shield className="h-4 w-4 mb-1" />
                  <span className="text-xs">Admin</span>
                </Button>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
