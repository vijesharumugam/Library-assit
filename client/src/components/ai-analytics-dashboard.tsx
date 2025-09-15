import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { 
  BarChart3,
  Brain,
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Activity,
  Zap,
  Eye,
  Download,
  Database,
  Lightbulb,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AIAnalytics, AIPrediction, Role } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface DashboardData {
  analytics: {
    usagePatterns: AIAnalytics[];
    inventoryInsights: AIAnalytics[];
    userBehavior: AIAnalytics[];
    performanceMetrics: AIAnalytics[];
  };
  predictions: {
    overdueRisks: AIPrediction[];
    popularityForecasts: AIPrediction[];
  };
  content: {
    totalBooksWithContent: number;
    recentContent: any[];
  };
  summary: {
    totalAnalytics: number;
    totalPredictions: number;
    totalAIContent: number;
  };
}

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

export function AIAnalyticsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  const handleGoBack = () => {
    // Navigate back to the appropriate dashboard based on user role
    if (user?.role === Role.ADMIN) {
      setLocation("/admin");
    } else if (user?.role === Role.LIBRARIAN) {
      setLocation("/librarian");
    } else {
      // Fallback to browser back if role is unclear
      window.history.back();
    }
  };

  // Main dashboard data query
  const { data: dashboardData, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/ai/dashboard"],
    enabled: user?.role === Role.LIBRARIAN || user?.role === Role.ADMIN,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Analytics generation mutations
  const generateUsagePatternsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analytics/usage-patterns", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/dashboard"] });
      setGeneratingType(null);
      toast({
        title: "Usage Patterns Generated",
        description: "New usage analytics are now available",
      });
    },
    onError: (error: Error) => {
      setGeneratingType(null);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateInventoryInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analytics/inventory-insights", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/dashboard"] });
      setGeneratingType(null);
      toast({
        title: "Inventory Insights Generated",
        description: "New inventory analytics are now available",
      });
    },
    onError: (error: Error) => {
      setGeneratingType(null);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateUserBehaviorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analytics/user-behavior", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/dashboard"] });
      setGeneratingType(null);
      toast({
        title: "User Behavior Analysis Generated",
        description: "New user behavior analytics are now available",
      });
    },
    onError: (error: Error) => {
      setGeneratingType(null);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generatePerformanceMetricsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analytics/performance-metrics", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/dashboard"] });
      setGeneratingType(null);
      toast({
        title: "Performance Metrics Generated",
        description: "New performance analytics are now available",
      });
    },
    onError: (error: Error) => {
      setGeneratingType(null);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateAnalytics = (type: string) => {
    setGeneratingType(type);
    
    switch (type) {
      case 'usage-patterns':
        generateUsagePatternsMutation.mutate();
        break;
      case 'inventory-insights':
        generateInventoryInsightsMutation.mutate();
        break;
      case 'user-behavior':
        generateUserBehaviorMutation.mutate();
        break;
      case 'performance-metrics':
        generatePerformanceMetricsMutation.mutate();
        break;
    }
  };

  if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.ADMIN)) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Restricted</AlertTitle>
        <AlertDescription>
          AI Analytics Dashboard is only available to librarians and administrators.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        <AlertDescription>
          Failed to load AI analytics data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleGoBack}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="title-ai-dashboard">
              <Brain className="h-8 w-8 text-primary" />
              AI Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive insights powered by artificial intelligence
            </p>
          </div>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="card-total-analytics">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Analytics</p>
                    <p className="text-2xl font-bold">{dashboardData?.summary?.totalAnalytics ?? 0}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-predictions">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">AI Predictions</p>
                    <p className="text-2xl font-bold">{dashboardData?.summary?.totalPredictions ?? 0}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-ai-content">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">AI Content</p>
                    <p className="text-2xl font-bold">{dashboardData?.summary?.totalAIContent ?? 0}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-overdue-risks">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Risk Alerts</p>
                    <p className="text-2xl font-bold">{dashboardData?.predictions?.overdueRisks?.length ?? 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Eye className="mr-1 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="usage" data-testid="tab-usage">
                <Activity className="mr-1 h-4 w-4" />
                Usage Patterns
              </TabsTrigger>
              <TabsTrigger value="inventory" data-testid="tab-inventory">
                <Database className="mr-1 h-4 w-4" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="behavior" data-testid="tab-behavior">
                <Users className="mr-1 h-4 w-4" />
                User Behavior
              </TabsTrigger>
              <TabsTrigger value="predictions" data-testid="tab-predictions">
                <Zap className="mr-1 h-4 w-4" />
                Predictions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={() => handleGenerateAnalytics('usage-patterns')}
                      disabled={generatingType === 'usage-patterns'}
                      className="w-full justify-start"
                      variant="outline"
                      data-testid="button-generate-usage-patterns"
                    >
                      {generatingType === 'usage-patterns' ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Activity className="mr-2 h-4 w-4" />
                      )}
                      Generate Usage Patterns
                    </Button>
                    
                    <Button
                      onClick={() => handleGenerateAnalytics('inventory-insights')}
                      disabled={generatingType === 'inventory-insights'}
                      className="w-full justify-start"
                      variant="outline"
                      data-testid="button-generate-inventory-insights"
                    >
                      {generatingType === 'inventory-insights' ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Database className="mr-2 h-4 w-4" />
                      )}
                      Generate Inventory Insights
                    </Button>
                    
                    <Button
                      onClick={() => handleGenerateAnalytics('user-behavior')}
                      disabled={generatingType === 'user-behavior'}
                      className="w-full justify-start"
                      variant="outline"
                      data-testid="button-generate-user-behavior"
                    >
                      {generatingType === 'user-behavior' ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Users className="mr-2 h-4 w-4" />
                      )}
                      Generate User Behavior Analysis
                    </Button>
                    
                    <Button
                      onClick={() => handleGenerateAnalytics('performance-metrics')}
                      disabled={generatingType === 'performance-metrics'}
                      className="w-full justify-start"
                      variant="outline"
                      data-testid="button-generate-performance-metrics"
                    >
                      {generatingType === 'performance-metrics' ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Target className="mr-2 h-4 w-4" />
                      )}
                      Generate Performance Metrics
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Recent AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {dashboardData?.analytics?.usagePatterns?.[0] && (
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">Usage Patterns</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(dashboardData?.analytics?.usagePatterns?.[0]?.generatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm">{dashboardData?.analytics?.usagePatterns?.[0]?.insights || dashboardData?.analytics?.usagePatterns?.[0]?.description}</p>
                          </div>
                        )}
                        
                        {dashboardData?.analytics?.inventoryInsights?.[0] && (
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">Inventory</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(dashboardData?.analytics?.inventoryInsights?.[0]?.generatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm">{dashboardData?.analytics?.inventoryInsights?.[0]?.insights || dashboardData?.analytics?.inventoryInsights?.[0]?.description}</p>
                          </div>
                        )}
                        
                        {(!dashboardData?.analytics?.usagePatterns?.[0] && !dashboardData?.analytics?.inventoryInsights?.[0]) && (
                          <div className="text-center text-muted-foreground py-8">
                            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No analytics generated yet.</p>
                            <p className="text-sm">Use the buttons to generate AI insights.</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Usage Pattern Analytics
                  </CardTitle>
                  <Button
                    onClick={() => handleGenerateAnalytics('usage-patterns')}
                    disabled={generatingType === 'usage-patterns'}
                    size="sm"
                    data-testid="button-refresh-usage-patterns"
                  >
                    {generatingType === 'usage-patterns' ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                </CardHeader>
                <CardContent>
                  {dashboardData?.analytics?.usagePatterns?.[0] ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Last updated: {new Date(dashboardData?.analytics?.usagePatterns?.[0]?.generatedAt).toLocaleString()}
                      </div>
                      {dashboardData?.analytics?.usagePatterns?.[0]?.insights && (
                        <Alert>
                          <Lightbulb className="h-4 w-4" />
                          <AlertTitle>AI Insights</AlertTitle>
                          <AlertDescription className="whitespace-pre-wrap">
                            {dashboardData?.analytics?.usagePatterns?.[0]?.insights}
                          </AlertDescription>
                        </Alert>
                      )}
                      {dashboardData?.analytics?.usagePatterns?.[0]?.data?.popularCategories && (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardData?.analytics?.usagePatterns?.[0]?.data?.popularCategories || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="category" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill={CHART_COLORS[0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No usage pattern analytics available.</p>
                      <p className="text-sm">Click "Regenerate" to generate new insights.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Inventory Insights
                  </CardTitle>
                  <Button
                    onClick={() => handleGenerateAnalytics('inventory-insights')}
                    disabled={generatingType === 'inventory-insights'}
                    size="sm"
                    data-testid="button-refresh-inventory-insights"
                  >
                    {generatingType === 'inventory-insights' ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                </CardHeader>
                <CardContent>
                  {dashboardData?.analytics?.inventoryInsights?.[0] ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Last updated: {new Date(dashboardData?.analytics?.inventoryInsights?.[0]?.generatedAt).toLocaleString()}
                      </div>
                      {dashboardData?.analytics?.inventoryInsights?.[0]?.insights && (
                        <Alert>
                          <Lightbulb className="h-4 w-4" />
                          <AlertTitle>AI Insights</AlertTitle>
                          <AlertDescription className="whitespace-pre-wrap">
                            {dashboardData?.analytics?.inventoryInsights?.[0]?.insights}
                          </AlertDescription>
                        </Alert>
                      )}
                      {dashboardData?.analytics?.inventoryInsights?.[0]?.data?.categoryDistribution && (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={dashboardData?.analytics?.inventoryInsights?.[0]?.data?.categoryDistribution || []}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="totalBooks"
                                label
                              >
                                {(dashboardData?.analytics?.inventoryInsights?.[0]?.data?.categoryDistribution || []).map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No inventory insights available.</p>
                      <p className="text-sm">Click "Regenerate" to generate new insights.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Behavior Analysis
                  </CardTitle>
                  <Button
                    onClick={() => handleGenerateAnalytics('user-behavior')}
                    disabled={generatingType === 'user-behavior'}
                    size="sm"
                    data-testid="button-refresh-user-behavior"
                  >
                    {generatingType === 'user-behavior' ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                </CardHeader>
                <CardContent>
                  {dashboardData?.analytics?.userBehavior?.[0] ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Last updated: {new Date(dashboardData?.analytics?.userBehavior?.[0]?.generatedAt).toLocaleString()}
                      </div>
                      {dashboardData?.analytics?.userBehavior?.[0]?.insights && (
                        <Alert>
                          <Lightbulb className="h-4 w-4" />
                          <AlertTitle>AI Insights</AlertTitle>
                          <AlertDescription className="whitespace-pre-wrap">
                            {dashboardData?.analytics?.userBehavior?.[0]?.insights}
                          </AlertDescription>
                        </Alert>
                      )}
                      {dashboardData?.analytics?.userBehavior?.[0]?.data?.peakBorrowingHours && (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dashboardData?.analytics?.userBehavior?.[0]?.data?.peakBorrowingHours || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="hour" />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="count" stroke={CHART_COLORS[2]} strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No user behavior analysis available.</p>
                      <p className="text-sm">Click "Regenerate" to generate new insights.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Overdue Risk Predictions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      {dashboardData?.predictions?.overdueRisks?.length ? (
                        <div className="space-y-3">
                          {(dashboardData?.predictions?.overdueRisks || []).map((prediction, index) => (
                            <div key={prediction.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="destructive">High Risk</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {(prediction.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <p className="text-sm">{prediction.reasoning || 'High risk user identified'}</p>
                              <div className="mt-2">
                                <Progress 
                                  value={prediction.confidence * 100} 
                                  className="h-2"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p>No high-risk predictions found.</p>
                          <p className="text-sm">All users appear to be low risk.</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Popularity Forecasts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      {dashboardData?.predictions?.popularityForecasts?.length ? (
                        <div className="space-y-3">
                          {(dashboardData?.predictions?.popularityForecasts || []).map((prediction, index) => (
                            <div key={prediction.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline">Trending</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {(prediction.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <p className="text-sm">{prediction.reasoning || 'Book expected to be popular'}</p>
                              <div className="mt-2">
                                <Progress 
                                  value={prediction.confidence * 100} 
                                  className="h-2"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No popularity forecasts available.</p>
                          <p className="text-sm">Generate predictions to see trends.</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}