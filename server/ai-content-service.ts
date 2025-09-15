import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "./storage";
import { Book, BookAIContent, InsertBookAIContent } from "@shared/schema";

// Initialize Google Gemini AI client
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface GeneratedContent {
  summary?: string;
  studyGuide?: string;
  quotes?: string[];
  comprehensionQA?: { question: string; answer: string }[];
}

export class AIContentService {
  
  /**
   * Generate comprehensive AI content for a book
   */
  async generateBookContent(book: Book): Promise<BookAIContent> {
    try {
      // Check if content already exists
      const existing = await storage.getBookAIContent(book.id);
      if (existing) {
        return existing;
      }

      console.log(`Generating AI content for book: ${book.title} by ${book.author}`);
      
      // Generate content using Gemini AI
      const content = await this.generateContentWithAI(book);
      
      // Store the generated content
      const insertData: InsertBookAIContent = {
        bookId: book.id,
        ...content
      };
      
      return await storage.createBookAIContent(insertData);
    } catch (error) {
      console.error('Error generating book content:', error);
      throw new Error('Failed to generate AI content for book');
    }
  }

  /**
   * Generate book summary
   */
  async generateBookSummary(book: Book): Promise<string> {
    try {
      const prompt = `Generate a comprehensive and engaging summary for the book "${book.title}" by ${book.author}. 
      Category: ${book.category}
      ${book.description ? `Description: ${book.description}` : ''}
      
      Instructions:
      1. Create a 2-3 paragraph summary that captures the main themes, plot (if fiction), or key concepts (if non-fiction)
      2. Make it engaging and informative for library patrons
      3. Avoid spoilers for fiction books
      4. Include why someone might want to read this book
      5. Write in a professional but accessible tone
      
      Summary:`;

      const model = ai.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return response.text().trim();
    } catch (error) {
      console.error('Error generating book summary:', error);
      return `A ${book.category.toLowerCase()} book by ${book.author}. ${book.description || 'This book offers valuable insights and knowledge for readers interested in the subject matter.'}`;
    }
  }

  /**
   * Generate study guide for a book
   */
  async generateStudyGuide(book: Book): Promise<string> {
    try {
      const prompt = `Create a comprehensive study guide for the book "${book.title}" by ${book.author}.
      Category: ${book.category}
      ${book.description ? `Description: ${book.description}` : ''}
      
      Instructions:
      1. Create key topics and themes to focus on
      2. Include important concepts and terminology
      3. Suggest discussion questions for book clubs or study groups
      4. Provide learning objectives
      5. Include practical applications where relevant
      6. Format as clear sections with headers
      
      Study Guide:`;

      const model = ai.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return response.text().trim();
    } catch (error) {
      console.error('Error generating study guide:', error);
      return `## Study Guide for ${book.title}

**Key Themes:**
- Explore the main concepts presented in this ${book.category.toLowerCase()} book
- Analyze the author's perspective and approach
- Consider the practical applications of the material

**Discussion Questions:**
1. What are the main arguments or themes presented?
2. How does this work relate to current issues or other works in the field?
3. What insights can be applied to personal or professional development?

**Further Study:**
- Research additional works by ${book.author}
- Explore related topics in the ${book.category} category`;
    }
  }

  /**
   * Generate memorable quotes from a book
   */
  async generateQuotes(book: Book): Promise<string[]> {
    try {
      const prompt = `Generate 5-7 inspiring, memorable, or significant quotes that would likely be found in the book "${book.title}" by ${book.author}.
      Category: ${book.category}
      ${book.description ? `Description: ${book.description}` : ''}
      
      Instructions:
      1. Create quotes that reflect the book's themes and style
      2. Make them inspirational or thought-provoking
      3. Ensure they sound authentic to the author's voice and the book's content
      4. Vary the length and style of quotes
      5. Focus on quotes that would resonate with readers
      6. Format as individual quotes, one per line
      
      Quotes:`;

      const model = ai.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      const quotesText = response.text().trim();
      // Split by lines and clean up
      const quotes = quotesText
        .split('\n')
        .map(quote => quote.trim())
        .filter(quote => quote.length > 10)
        .map(quote => quote.replace(/^["\-\*\d\.\s]+/, '').replace(/["]+$/, ''))
        .slice(0, 7);
      
      return quotes.length > 0 ? quotes : [
        `"Knowledge is power, and ${book.title} offers valuable insights for personal growth."`,
        `"Every great book opens new doors to understanding and wisdom."`,
        `"The ideas in this work by ${book.author} have the potential to transform perspectives."`
      ];
    } catch (error) {
      console.error('Error generating quotes:', error);
      return [
        `"Knowledge is power, and ${book.title} offers valuable insights for personal growth."`,
        `"Every great book opens new doors to understanding and wisdom."`,
        `"The ideas in this work by ${book.author} have the potential to transform perspectives."`
      ];
    }
  }

  /**
   * Generate comprehension Q&A for a book
   */
  async generateComprehensionQA(book: Book): Promise<{ question: string; answer: string }[]> {
    try {
      const prompt = `Create 6-8 comprehension questions and answers for the book "${book.title}" by ${book.author}.
      Category: ${book.category}
      ${book.description ? `Description: ${book.description}` : ''}
      
      Instructions:
      1. Create questions that test understanding of key concepts
      2. Include both factual and analytical questions
      3. Provide clear, informative answers
      4. Make questions suitable for students or book club discussions
      5. Vary difficulty levels from basic to advanced
      6. Format as: Q: [question] A: [answer]
      
      Questions and Answers:`;

      const model = ai.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      const qaText = response.text().trim();
      const qaArray: { question: string; answer: string }[] = [];
      
      // Parse Q&A format
      const lines = qaText.split('\n');
      let currentQuestion = '';
      let currentAnswer = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^Q\d*[:\.]?\s*/i)) {
          // Save previous Q&A if exists
          if (currentQuestion && currentAnswer) {
            qaArray.push({ question: currentQuestion.trim(), answer: currentAnswer.trim() });
          }
          currentQuestion = trimmed.replace(/^Q\d*[:\.]?\s*/i, '');
          currentAnswer = '';
        } else if (trimmed.match(/^A\d*[:\.]?\s*/i)) {
          currentAnswer = trimmed.replace(/^A\d*[:\.]?\s*/i, '');
        } else if (currentAnswer && trimmed) {
          currentAnswer += ' ' + trimmed;
        } else if (currentQuestion && trimmed && !currentAnswer) {
          currentQuestion += ' ' + trimmed;
        }
      }
      
      // Add the last Q&A
      if (currentQuestion && currentAnswer) {
        qaArray.push({ question: currentQuestion.trim(), answer: currentAnswer.trim() });
      }
      
      // Return generated Q&A or fallback
      return qaArray.length > 0 ? qaArray.slice(0, 8) : [
        {
          question: `What is the main focus of "${book.title}"?`,
          answer: `This ${book.category.toLowerCase()} book by ${book.author} explores important themes and concepts relevant to its field.`
        },
        {
          question: `Who would benefit from reading this book?`,
          answer: `Readers interested in ${book.category.toLowerCase()} topics and those seeking to expand their knowledge in this area.`
        },
        {
          question: `What makes this book unique?`,
          answer: `${book.author}'s perspective and approach to the subject matter provide valuable insights and practical applications.`
        }
      ];
    } catch (error) {
      console.error('Error generating comprehension Q&A:', error);
      return [
        {
          question: `What is the main focus of "${book.title}"?`,
          answer: `This ${book.category.toLowerCase()} book by ${book.author} explores important themes and concepts relevant to its field.`
        },
        {
          question: `Who would benefit from reading this book?`,
          answer: `Readers interested in ${book.category.toLowerCase()} topics and those seeking to expand their knowledge in this area.`
        }
      ];
    }
  }

  /**
   * Generate all AI content for a book
   */
  private async generateContentWithAI(book: Book): Promise<GeneratedContent> {
    const [summary, studyGuide, quotes, comprehensionQA] = await Promise.all([
      this.generateBookSummary(book),
      this.generateStudyGuide(book),
      this.generateQuotes(book),
      this.generateComprehensionQA(book)
    ]);

    return {
      summary,
      studyGuide,
      quotes,
      comprehensionQA
    };
  }

  /**
   * Update existing book AI content
   */
  async updateBookContent(bookId: string, updates: Partial<InsertBookAIContent>): Promise<BookAIContent | null> {
    return await storage.updateBookAIContent(bookId, updates);
  }

  /**
   * Get AI content for a book
   */
  async getBookContent(bookId: string): Promise<BookAIContent | null> {
    return await storage.getBookAIContent(bookId);
  }

  /**
   * Get all AI content
   */
  async getAllBookContent(): Promise<BookAIContent[]> {
    return await storage.getAllBookAIContent();
  }

  /**
   * Answer questions about a specific book using AI
   */
  async answerBookQuestion(book: Book, question: string): Promise<string> {
    try {
      // Get existing AI content for context
      const existingContent = await storage.getBookAIContent(book.id);
      
      let context = `Book: "${book.title}" by ${book.author} (${book.category})`;
      if (book.description) context += `\nDescription: ${book.description}`;
      if (existingContent?.summary) context += `\nSummary: ${existingContent.summary}`;
      
      const prompt = `${context}

User Question: ${question}

Instructions:
1. Answer the question based on the book information provided
2. Be helpful and informative
3. If you don't have specific information, provide general guidance
4. Keep the answer concise but comprehensive
5. Encourage reading the book for more detailed information

Answer:`;

      const model = ai.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return response.text().trim();
    } catch (error) {
      console.error('Error answering book question:', error);
      return `I'd be happy to help you learn more about "${book.title}" by ${book.author}. For the most accurate and detailed information, I recommend checking out the book from our library. If you have specific questions about availability or related books, feel free to ask!`;
    }
  }
}