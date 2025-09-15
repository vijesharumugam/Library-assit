import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "./storage";
import { AIPrediction, InsertAIPrediction, User, Book, Transaction, TransactionWithUserAndBook } from "@shared/schema";

// Initialize Google Gemini AI client
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface OverdueRiskPrediction {
  userId: string;
  riskScore: number; // 0-1 (0 = low risk, 1 = high risk)
  factors: string[];
  recommendedActions: string[];
  daysUntilDue: number;
  confidence: number;
}

interface PopularityForecast {
  bookId: string;
  expectedDemand: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  seasonalFactors: string[];
  recommendedCopies: number;
  confidence: number;
}

interface OptimalDueDateSuggestion {
  transactionId: string;
  suggestedDueDate: Date;
  reasoning: string[];
  userProfile: string;
  confidence: number;
}

export class AIPredictiveService {

  /**
   * Predict overdue risk for active borrowers
   */
  async predictOverdueRisk(userId?: string): Promise<AIPrediction[]> {
    try {
      console.log('Generating overdue risk predictions...');
      
      const activeTransactions = await storage.getActiveTransactions();
      const targetTransactions = userId 
        ? activeTransactions.filter(t => t.userId === userId)
        : activeTransactions;
      
      const predictions: AIPrediction[] = [];
      
      for (const transaction of targetTransactions) {
        const riskPrediction = await this.calculateOverdueRisk(transaction);
        
        if (riskPrediction.riskScore > 0.3) { // Only store significant risks
          const prediction: InsertAIPrediction = {
            type: 'OVERDUE_RISK',
            targetId: transaction.userId,
            prediction: riskPrediction,
            confidence: riskPrediction.confidence,
            reasoning: `User has ${(riskPrediction.riskScore * 100).toFixed(0)}% risk of returning "${transaction.book.title}" late. Key factors: ${riskPrediction.factors.join(', ')}`,
            validUntil: new Date(transaction.dueDate)
          };
          
          const storedPrediction = await storage.createAIPrediction(prediction);
          predictions.push(storedPrediction);
        }
      }
      
      return predictions;
    } catch (error) {
      console.error('Error predicting overdue risk:', error);
      throw new Error('Failed to generate overdue risk predictions');
    }
  }

  /**
   * Forecast book popularity trends
   */
  async forecastBookPopularity(bookId?: string): Promise<AIPrediction[]> {
    try {
      console.log('Generating book popularity forecasts...');
      
      const books = await storage.getAllBooks();
      const transactions = await storage.getAllTransactions();
      const targetBooks = bookId ? books.filter(b => b.id === bookId) : books;
      
      const predictions: AIPrediction[] = [];
      
      for (const book of targetBooks.slice(0, 20)) { // Limit to top 20 books for performance
        const forecast = await this.calculatePopularityForecast(book, transactions);
        
        if (forecast.confidence > 0.5) { // Only store confident predictions
          const prediction: InsertAIPrediction = {
            type: 'POPULAR_BOOK_FORECAST',
            targetId: book.id,
            prediction: forecast,
            confidence: forecast.confidence,
            reasoning: `"${book.title}" is predicted to have ${forecast.trendDirection} demand (${forecast.expectedDemand} requests/month). Factors: ${forecast.seasonalFactors.join(', ')}`,
            validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Valid for 90 days
          };
          
          const storedPrediction = await storage.createAIPrediction(prediction);
          predictions.push(storedPrediction);
        }
      }
      
      return predictions;
    } catch (error) {
      console.error('Error forecasting book popularity:', error);
      throw new Error('Failed to generate popularity forecasts');
    }
  }

  /**
   * Calculate optimal due dates for new borrowings
   */
  async calculateOptimalDueDate(userId: string, bookId: string): Promise<AIPrediction> {
    try {
      console.log(`Calculating optimal due date for user ${userId} and book ${bookId}...`);
      
      const user = await storage.getUser(userId);
      const book = await storage.getBook(bookId);
      const userTransactions = await storage.getUserTransactions(userId);
      
      if (!user || !book) {
        throw new Error('User or book not found');
      }
      
      const suggestion = await this.generateOptimalDueDate(user, book, userTransactions);
      
      const prediction: InsertAIPrediction = {
        type: 'OPTIMAL_DUE_DATE',
        targetId: `${userId}-${bookId}`,
        prediction: suggestion,
        confidence: suggestion.confidence,
        reasoning: `Optimal due date calculated based on user profile (${suggestion.userProfile}) and historical patterns. ${suggestion.reasoning.join(' ')}`,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Valid for 7 days
      };
      
      return await storage.createAIPrediction(prediction);
    } catch (error) {
      console.error('Error calculating optimal due date:', error);
      throw new Error('Failed to calculate optimal due date');
    }
  }

  /**
   * Calculate overdue risk for a specific transaction
   */
  private async calculateOverdueRisk(transaction: TransactionWithUserAndBook): Promise<OverdueRiskPrediction> {
    const user = transaction.user;
    const book = transaction.book;
    const dueDate = new Date(transaction.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get user's borrowing history
    const userTransactions = await storage.getUserTransactions(user.id);
    const completedTransactions = userTransactions.filter(t => t.returnedDate);
    
    let riskScore = 0.1; // Base risk
    const factors: string[] = [];
    
    // Factor 1: Historical overdue rate
    if (completedTransactions.length > 0) {
      const overdueCount = completedTransactions.filter(t => {
        const returned = new Date(t.returnedDate!);
        const due = new Date(t.dueDate);
        return returned > due;
      }).length;
      
      const overdueRate = overdueCount / completedTransactions.length;
      riskScore += overdueRate * 0.4;
      
      if (overdueRate > 0.3) {
        factors.push(`high historical overdue rate (${(overdueRate * 100).toFixed(0)}%)`);
      }
    }
    
    // Factor 2: Time until due date
    if (daysUntilDue <= 2) {
      riskScore += 0.3;
      factors.push('book due very soon');
    } else if (daysUntilDue <= 5) {
      riskScore += 0.15;
      factors.push('book due soon');
    }
    
    // Factor 3: Book category complexity (fiction vs non-fiction)
    if (book.category.toLowerCase().includes('textbook') || 
        book.category.toLowerCase().includes('reference') ||
        book.category.toLowerCase().includes('technical')) {
      riskScore += 0.1;
      factors.push('complex subject matter');
    }
    
    // Factor 4: Current borrowing load
    const currentBorrowings = userTransactions.filter(t => !t.returnedDate).length;
    if (currentBorrowings > 3) {
      riskScore += 0.15;
      factors.push('multiple active borrowings');
    }
    
    // Factor 5: Student status and timing
    if (user.role === 'STUDENT') {
      const now = new Date();
      const isExamPeriod = now.getMonth() === 4 || now.getMonth() === 11; // May or December
      if (isExamPeriod) {
        riskScore += 0.1;
        factors.push('exam period timing');
      }
    }
    
    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0);
    
    // Generate recommendations
    const recommendedActions: string[] = [];
    if (riskScore > 0.7) {
      recommendedActions.push('Send immediate reminder');
      recommendedActions.push('Consider extension offer');
    } else if (riskScore > 0.5) {
      recommendedActions.push('Send early reminder');
      recommendedActions.push('Monitor closely');
    } else if (riskScore > 0.3) {
      recommendedActions.push('Standard reminder schedule');
    }
    
    const confidence = Math.min(0.9, 0.5 + (completedTransactions.length * 0.05)); // Higher confidence with more history
    
    return {
      userId: user.id,
      riskScore,
      factors,
      recommendedActions,
      daysUntilDue,
      confidence
    };
  }

  /**
   * Calculate popularity forecast for a book
   */
  private async calculatePopularityForecast(book: Book, allTransactions: any[]): Promise<PopularityForecast> {
    // Get borrowing history for this book
    const bookTransactions = allTransactions.filter(t => t.bookId === book.id);
    
    // Calculate monthly demand over last 6 months
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
    const recentTransactions = bookTransactions.filter(t => new Date(t.borrowedDate) >= sixMonthsAgo);
    
    const monthlyDemand = new Map<string, number>();
    recentTransactions.forEach(t => {
      const month = new Date(t.borrowedDate).toISOString().slice(0, 7); // YYYY-MM
      monthlyDemand.set(month, (monthlyDemand.get(month) || 0) + 1);
    });
    
    const demandData = Array.from(monthlyDemand.values());
    const avgMonthlyDemand = demandData.length > 0 ? demandData.reduce((sum, val) => sum + val, 0) / demandData.length : 0;
    
    // Analyze trend
    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (demandData.length >= 3) {
      const recent = demandData.slice(-2).reduce((sum, val) => sum + val, 0) / 2;
      const older = demandData.slice(0, -2).reduce((sum, val) => sum + val, 0) / Math.max(1, demandData.length - 2);
      
      if (recent > older * 1.2) {
        trendDirection = 'increasing';
      } else if (recent < older * 0.8) {
        trendDirection = 'decreasing';
      }
    }
    
    // Seasonal factors based on category
    const seasonalFactors: string[] = [];
    const now = new Date();
    const month = now.getMonth();
    
    if (book.category.toLowerCase().includes('textbook') || book.category.toLowerCase().includes('academic')) {
      if (month >= 8 && month <= 11) { // Sept-Dec
        seasonalFactors.push('academic semester peak');
      } else if (month >= 0 && month <= 4) { // Jan-May
        seasonalFactors.push('spring semester demand');
      }
    }
    
    if (book.category.toLowerCase().includes('fiction') || book.category.toLowerCase().includes('novel')) {
      if (month >= 5 && month <= 7) { // June-Aug
        seasonalFactors.push('summer reading season');
      } else if (month >= 10 && month <= 11) { // Nov-Dec
        seasonalFactors.push('holiday reading period');
      }
    }
    
    // Calculate expected demand
    let expectedDemand = avgMonthlyDemand;
    if (seasonalFactors.length > 0) {
      expectedDemand *= 1.3; // Boost for seasonal factors
    }
    
    if (trendDirection === 'increasing') {
      expectedDemand *= 1.2;
    } else if (trendDirection === 'decreasing') {
      expectedDemand *= 0.8;
    }
    
    // Recommend optimal number of copies
    const currentUtilizationRate = (book.totalCopies - book.availableCopies) / book.totalCopies;
    let recommendedCopies = book.totalCopies;
    
    if (expectedDemand > book.totalCopies * 0.8) {
      recommendedCopies = Math.ceil(expectedDemand * 1.2);
    } else if (currentUtilizationRate < 0.3 && trendDirection === 'decreasing') {
      recommendedCopies = Math.max(1, Math.floor(book.totalCopies * 0.8));
    }
    
    // Calculate confidence based on data availability
    const confidence = Math.min(0.9, 0.3 + (recentTransactions.length * 0.1));
    
    return {
      bookId: book.id,
      expectedDemand: Math.round(expectedDemand * 10) / 10,
      trendDirection,
      seasonalFactors,
      recommendedCopies,
      confidence
    };
  }

  /**
   * Generate optimal due date suggestion
   */
  private async generateOptimalDueDate(user: User, book: Book, userHistory: any[]): Promise<OptimalDueDateSuggestion> {
    const completedTransactions = userHistory.filter(t => t.returnedDate);
    
    // Calculate user's average reading time
    let avgReadingDays = 14; // Default
    if (completedTransactions.length > 0) {
      const totalDays = completedTransactions.reduce((sum, t) => {
        const borrowed = new Date(t.borrowedDate);
        const returned = new Date(t.returnedDate);
        return sum + ((returned.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgReadingDays = totalDays / completedTransactions.length;
    }
    
    // Adjust based on book characteristics
    let adjustedDays = avgReadingDays;
    const reasoning: string[] = [];
    
    // Book length/complexity adjustment
    if (book.category.toLowerCase().includes('textbook') || 
        book.category.toLowerCase().includes('reference') ||
        book.category.toLowerCase().includes('technical')) {
      adjustedDays *= 1.5;
      reasoning.push('Technical/reference material requires extended reading time');
    } else if (book.category.toLowerCase().includes('fiction') || 
               book.category.toLowerCase().includes('novel')) {
      adjustedDays *= 0.9;
      reasoning.push('Fiction typically has faster reading pace');
    }
    
    // User profile adjustment
    let userProfile = 'regular reader';
    if (completedTransactions.length > 10) {
      userProfile = 'frequent reader';
      adjustedDays *= 0.9;
      reasoning.push('Frequent reader with established reading habits');
    } else if (completedTransactions.length < 3) {
      userProfile = 'new reader';
      adjustedDays *= 1.2;
      reasoning.push('New user needs additional time to establish reading routine');
    }
    
    // Check for overdue patterns
    const overdueCount = completedTransactions.filter(t => {
      const returned = new Date(t.returnedDate);
      const due = new Date(t.dueDate);
      return returned > due;
    }).length;
    
    if (overdueCount > completedTransactions.length * 0.3) {
      adjustedDays *= 1.3;
      reasoning.push('User history shows tendency for extended reading periods');
    }
    
    // Current load adjustment
    const currentBorrowings = userHistory.filter(t => !t.returnedDate).length;
    if (currentBorrowings > 2) {
      adjustedDays *= 1.2;
      reasoning.push('Multiple active borrowings may extend reading time');
    }
    
    // Academic calendar considerations
    if (user.role === 'STUDENT') {
      const now = new Date();
      const isExamPeriod = now.getMonth() === 4 || now.getMonth() === 11; // May or December
      if (isExamPeriod) {
        adjustedDays *= 1.4;
        reasoning.push('Exam period requires extended due dates');
      }
    }
    
    // Calculate suggested due date
    const suggestedDays = Math.max(7, Math.min(30, Math.round(adjustedDays))); // Between 7-30 days
    const suggestedDueDate = new Date(Date.now() + suggestedDays * 24 * 60 * 60 * 1000);
    
    const confidence = Math.min(0.9, 0.5 + (completedTransactions.length * 0.05));
    
    return {
      transactionId: '', // Will be set when transaction is created
      suggestedDueDate,
      reasoning,
      userProfile,
      confidence
    };
  }

  /**
   * Get predictions by type
   */
  async getPredictionsByType(type: string): Promise<AIPrediction[]> {
    return await storage.getAIPredictionsByType(type);
  }

  /**
   * Get predictions for a specific target
   */
  async getPredictionsByTarget(targetId: string): Promise<AIPrediction[]> {
    return await storage.getAIPredictionsByTarget(targetId);
  }

  /**
   * Get all predictions
   */
  async getAllPredictions(): Promise<AIPrediction[]> {
    return await storage.getAllAIPredictions();
  }

  /**
   * Clean up old predictions
   */
  async cleanupOldPredictions(): Promise<number> {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days old
    return await storage.deleteOldAIPredictions(cutoffDate);
  }

  /**
   * Generate comprehensive risk assessment using AI
   */
  async generateRiskAssessment(userId: string): Promise<string> {
    try {
      const user = await storage.getUser(userId);
      const userTransactions = await storage.getUserTransactions(userId);
      const predictions = await storage.getAIPredictionsByTarget(userId);
      
      if (!user) return 'User not found';
      
      const completedTransactions = userTransactions.filter(t => t.returnedDate);
      const activeTransactions = userTransactions.filter(t => !t.returnedDate);
      
      const overdueCount = completedTransactions.filter(t => {
        const returned = new Date(t.returnedDate!);
        const due = new Date(t.dueDate);
        return returned > due;
      }).length;
      
      const overdueRate = completedTransactions.length > 0 ? (overdueCount / completedTransactions.length) * 100 : 0;
      
      const prompt = `Analyze this library user's risk profile and provide recommendations:

User Profile: ${user.fullName} (${user.role})
- Total transactions: ${userTransactions.length}
- Completed transactions: ${completedTransactions.length}
- Currently borrowed: ${activeTransactions.length}
- Historical overdue rate: ${overdueRate.toFixed(1)}%

Current Active Borrowings: ${activeTransactions.map(t => `"${t.book.title}" (due ${new Date(t.dueDate).toLocaleDateString()})`).join(', ')}

Risk Predictions: ${predictions.length > 0 ? 'High risk detected for some items' : 'No significant risks identified'}

Instructions:
1. Assess overall risk level (Low/Medium/High)
2. Identify key risk factors
3. Provide specific recommendations for this user
4. Suggest intervention strategies if needed
5. Keep assessment professional and actionable

Risk Assessment:`;

      const model = ai.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return response.text().trim();
    } catch (error) {
      console.error('Error generating risk assessment:', error);
      return `Risk assessment for user ${userId}: Based on available data, standard monitoring and reminder procedures should be sufficient. Regular check-ins recommended for active borrowings.`;
    }
  }
}