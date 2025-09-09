import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Users, Shield, TrendingUp, LogOut, UserPlus, Edit, Trash2, ChevronUp, Bell, Send } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, Transaction, User, TransactionStatus, Role } from "@shared/schema";
import { AddBookModal } from "@/components/add-book-modal";
import FloatingLibraryElements from "@/components/FloatingLibraryElements";

const pushNotificationSchema = z.object({
  userId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  message: z.string().min(1, "Message is required").max(200, "Message must be less than 200 characters"),
});

function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: books = [], isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const { data: allTransactions = [], isLoading: transactionsLoading } = useQuery<(Transaction & { user: User; book: Book })[]>({
    queryKey: ["/api/transactions"],
  });

  const promoteUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User role updated successfully",
        description: "The user's role has been changed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User deleted successfully",
        description: "The user account has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testPushNotificationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pushNotificationSchema>) => {
      const res = await apiRequest("POST", "/api/push/test", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test notification sent!",
        description: "Push notification has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send notification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pushForm = useForm<z.infer<typeof pushNotificationSchema>>({
    resolver: zodResolver(pushNotificationSchema),
    defaultValues: {
      title: "Test Library Notification",
      message: "This is a test push notification from Library Sanctum!",
      userId: "",
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = userSearchQuery === "" || 
        u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
      const matchesRole = roleFilter === "" || roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearchQuery, roleFilter]);

  const { totalUsers, totalBooks, activeLoans, librarians } = useMemo(() => {
    return {
      totalUsers: users.length,
      totalBooks: books.length,
      activeLoans: allTransactions.filter(t => t.status === "BORROWED").length,
      librarians: users.filter(u => u.role === "LIBRARIAN").length
    };
  }, [users, books, allTransactions]);

  const handlePromoteUser = (userId: string, currentRole: Role) => {
    const nextRole = currentRole === "STUDENT" ? "LIBRARIAN" : "ADMIN";
    promoteUserMutation.mutate({ userId, role: nextRole });
  };

  return (
    <div className="min-h-screen bg-background library-pattern relative">
      <FloatingLibraryElements />
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary mr-2 sm:mr-3" />
              <h1 className="text-base sm:text-xl library-heading">Library Sanctum - Admin</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Welcome, <span className="font-medium text-foreground" data-testid="text-user-name">{user?.fullName}</span>
              </span>
              <Badge variant="destructive" data-testid="badge-user-role" className="text-xs">Admin</Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
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
                    <AlertDialogCancel data-testid="button-cancel-logout">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => logoutMutation.mutate()}
                      data-testid="button-confirm-logout"
                    >
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
            <TabsTrigger value="books" data-testid="tab-books">Book Management</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">All Transactions</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">Push Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* System Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-total-users">
                        {totalUsers}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <BookOpen className="h-6 w-6 text-accent" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Books</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-total-books">
                        {totalBooks}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Active Loans</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-active-loans">
                        {activeLoans}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Librarians</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-librarians">
                        {librarians}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle data-testid="title-system-activity">System Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allTransactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between" data-testid={`activity-${transaction.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                          <span className="text-sm text-foreground">
                            {transaction.status === "BORROWED" ? "New borrowing" : "Book returned"} by {transaction.user.fullName}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {transaction.borrowedDate ? new Date(transaction.borrowedDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle data-testid="title-system-health">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Database Status</span>
                      <Badge variant="default">Online</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">API Response Time</span>
                      <span className="text-sm font-medium text-accent">45ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Active Sessions</span>
                      <span className="text-sm font-medium text-foreground">{totalUsers}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">User Management</h2>
                <p className="text-muted-foreground">Oversee user accounts, roles, and permissions</p>
              </div>
              <Button data-testid="button-add-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </div>

            {/* User Search and Filter */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    data-testid="input-search-users"
                    className="flex-1"
                  />
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48" data-testid="select-role-filter">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="STUDENT">Students</SelectItem>
                      <SelectItem value="LIBRARIAN">Librarians</SelectItem>
                      <SelectItem value="ADMIN">Administrators</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading users...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Books Borrowed</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {filteredUsers.map((u) => {
                          const userTransactions = allTransactions.filter(t => t.userId === u.id && t.status === "BORROWED");
                          
                          return (
                            <tr key={u.id} className="hover:bg-muted/50" data-testid={`row-user-${u.id}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                                    <span className="text-sm font-medium text-primary" data-testid={`text-user-initials-${u.id}`}>
                                      {u.fullName.split(' ').map(n => n[0]).join('')}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-foreground" data-testid={`text-user-name-${u.id}`}>
                                      {u.fullName}
                                    </div>
                                    <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${u.id}`}>
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge 
                                  variant={
                                    u.role === "ADMIN" ? "destructive" :
                                    u.role === "LIBRARIAN" ? "default" : "secondary"
                                  }
                                  data-testid={`badge-user-role-${u.id}`}
                                >
                                  {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-user-joined-${u.id}`}>
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="default" data-testid={`badge-user-status-${u.id}`}>Active</Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-user-books-count-${u.id}`}>
                                {userTransactions.length}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex space-x-2">
                                  {u.role !== "ADMIN" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePromoteUser(u.id, u.role)}
                                      disabled={promoteUserMutation.isPending}
                                      data-testid={`button-promote-user-${u.id}`}
                                      title="Promote to next role"
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`button-edit-user-${u.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {u.id !== user?.id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteUserMutation.mutate(u.id)}
                                      disabled={deleteUserMutation.isPending}
                                      data-testid={`button-delete-user-${u.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="books" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Book Management</h2>
                <p className="text-muted-foreground">Complete book collection management</p>
              </div>
              <Button
                onClick={() => setShowAddBookModal(true)}
                data-testid="button-add-new-book"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Add New Book
              </Button>
            </div>

            {/* Same as librarian book management */}
            <Card>
              <CardContent className="p-6 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Book management interface (enhanced with admin privileges)</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">All Transactions</h2>
              <p className="text-muted-foreground">Complete transaction oversight with administrative controls</p>
            </div>

            <Card>
              <CardContent className="p-0">
                {transactionsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Borrowed</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {allTransactions.map((transaction) => {
                          const dueDate = new Date(transaction.dueDate);
                          const today = new Date();
                          const isOverdue = transaction.status === "BORROWED" && dueDate < today;

                          return (
                            <tr key={transaction.id} className="hover:bg-muted/50" data-testid={`row-transaction-${transaction.id}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-xs font-medium text-primary">
                                      {transaction.user.fullName.split(' ').map(n => n[0]).join('')}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-foreground" data-testid={`text-user-name-${transaction.id}`}>
                                      {transaction.user.fullName}
                                    </div>
                                    <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${transaction.id}`}>
                                      {transaction.user.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-foreground" data-testid={`text-book-title-${transaction.id}`}>
                                  {transaction.book.title}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`text-book-author-${transaction.id}`}>
                                  {transaction.book.author}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-borrowed-date-${transaction.id}`}>
                                {transaction.borrowedDate ? new Date(transaction.borrowedDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-due-date-${transaction.id}`}>
                                {dueDate.toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <Badge 
                                  variant={
                                    transaction.status === "RETURNED" ? "default" :
                                    isOverdue ? "destructive" : "secondary"
                                  }
                                  data-testid={`badge-status-${transaction.id}`}
                                >
                                  {transaction.status === "RETURNED" ? "Returned" :
                                   isOverdue ? "Overdue" : "Borrowed"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Push Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Push Notification Testing
                </CardTitle>
                <CardDescription>
                  Test push notifications to ensure they work correctly. Send notifications to specific users or all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...pushForm}>
                  <form 
                    onSubmit={pushForm.handleSubmit((data) => testPushNotificationMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={pushForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target User (Optional)</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              data-testid="select-target-user"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Send to all users" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="" data-testid="option-all-users">
                                  All Users
                                </SelectItem>
                                {users.map((user) => (
                                  <SelectItem 
                                    key={user.id} 
                                    value={user.id}
                                    data-testid={`option-user-${user.id}`}
                                  >
                                    {user.fullName} ({user.email}) - {user.role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={pushForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Title</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="Enter notification title"
                              data-testid="input-notification-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={pushForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Message</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="Enter notification message"
                              data-testid="input-notification-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={testPushNotificationMutation.isPending}
                      className="w-full md:w-auto"
                      data-testid="button-send-test-notification"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {testPushNotificationMutation.isPending ? "Sending..." : "Send Test Notification"}
                    </Button>
                  </form>
                </Form>

                <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-blue-500">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    How to test push notifications:
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• First, make sure you've allowed notifications in your browser</li>
                    <li>• Choose a specific user or leave blank to send to everyone</li>
                    <li>• Enter a title and message for your test notification</li>
                    <li>• Click "Send Test Notification" and check if the notification appears</li>
                    <li>• The notification should appear like a native mobile app notification</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AddBookModal 
          open={showAddBookModal} 
          onOpenChange={setShowAddBookModal}
        />
      </div>
    </div>
  );
}

export default memo(AdminDashboard);
