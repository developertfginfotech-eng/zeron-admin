import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertInvestorSchema, 
  insertPropertySchema, 
  insertTransactionSchema, 
  insertChatMessageSchema, 
  insertAiInsightSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Investors endpoints
  app.get("/api/investors", async (req, res) => {
    try {
      const investors = await storage.getAllInvestors();
      res.json(investors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investors" });
    }
  });

  app.get("/api/investors/:id", async (req, res) => {
    try {
      const investor = await storage.getInvestor(req.params.id);
      if (!investor) {
        return res.status(404).json({ error: "Investor not found" });
      }
      res.json(investor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investor" });
    }
  });


  app.post("/api/investors", async (req, res) => {
    try {
      const validatedData = insertInvestorSchema.parse(req.body);
      const investor = await storage.createInvestor(validatedData);
      res.status(201).json(investor);
    } catch (error) {
      res.status(400).json({ error: "Invalid investor data" });
    }
  });

  app.put("/api/investors/:id", async (req, res) => {
    try {
      const validatedData = insertInvestorSchema.partial().parse(req.body);
      const investor = await storage.updateInvestor(req.params.id, validatedData);
      if (!investor) {
        return res.status(404).json({ error: "Investor not found" });
      }
      res.json(investor);
    } catch (error) {
      res.status(400).json({ error: "Invalid investor data" });
    }
  });

  // Properties endpoints
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      res.status(400).json({ error: "Invalid property data" });
    }
  });

  // Transactions endpoints
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/investor/:investorId", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByInvestor(req.params.investorId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  // Chat messages endpoints
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const messages = await storage.getChatMessagesByUser(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // AI Insights endpoints
  app.get("/api/ai/insights", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const insights = type 
        ? await storage.getAiInsightsByType(type)
        : await storage.getAllAiInsights();
      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI insights" });
    }
  });

  app.post("/api/ai/insights", async (req, res) => {
    try {
      const validatedData = insertAiInsightSchema.parse(req.body);
      const insight = await storage.createAiInsight(validatedData);
      res.status(201).json(insight);
    } catch (error) {
      res.status(400).json({ error: "Invalid insight data" });
    }
  });

  // AI Chat completion endpoint (will integrate with OpenAI)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, userId, language } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Store user message
      await storage.createChatMessage({
        userId: userId || null,
        message,
        sender: "user",
        aiContext: null
      });

      // Generate AI response (for now, mock response)
      const aiResponse = generateMockAiResponse(message, language);
      
      // Store AI response
      const aiMessage = await storage.createChatMessage({
        userId: userId || null,
        message: aiResponse,
        sender: "ai",
        aiContext: "response"
      });

      res.json(aiMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Mock AI response function (will be replaced with OpenAI integration)
function generateMockAiResponse(userMessage: string, language?: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('dashboard') || lowerMessage.includes('overview')) {
    return language === 'ar' 
      ? 'أرى أنك تسأل عن لوحة التحكم. حالياً لديك مستخدمون نشطون وعقارات متاحة للاستثمار.'
      : 'I see you\'re asking about the dashboard. Currently you have active users and properties available for investment.';
  } else if (lowerMessage.includes('property') || lowerMessage.includes('عقار')) {
    return language === 'ar'
      ? 'بخصوص العقارات، لدينا فرص استثمارية ممتازة في الرياض وجدة.'
      : 'Regarding properties, we have excellent investment opportunities in Riyadh and Jeddah.';
  } else if (lowerMessage.includes('kyc') || lowerMessage.includes('verification')) {
    return language === 'ar'
      ? 'لديك طلبات KYC في انتظار المراجعة. معدل الموافقة الحالي مرتفع.'
      : 'You have KYC requests pending review. Current approval rate is high.';
  } else {
    return language === 'ar'
      ? 'شكراً لك على سؤالك. كيف يمكنني مساعدتك في إدارة استثماراتك العقارية؟'
      : 'Thank you for your question. How can I help you manage your real estate investments?';
  }
}