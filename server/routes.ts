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

const BACKEND_API_URL = process.env.BACKEND_API_URL || "https://zeron-backend-z5o1.onrender.com";

export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * PROXY ALL AUTH AND ADMIN ENDPOINTS TO BACKEND
   * The backend has complete authentication, RBAC, and audit logging
   */

  // Generic proxy function for backend API calls
  const proxyToBackend = async (
    req: any,
    res: any,
    method: string,
    path: string
  ) => {
    try {
      const token = req.headers.authorization;
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: token }),
        },
      };

      if (method !== "GET" && req.body) {
        options.body = JSON.stringify(req.body);
      }

      const url = `${BACKEND_API_URL}${path}`;
      const response = await fetch(url, options);
      const data = await response.json();

      res.status(response.status).json(data);
    } catch (error: any) {
      console.error(`Proxy error for ${path}:`, error);
      res.status(500).json({
        success: false,
        error: "Backend request failed",
      });
    }
  };

  /**
   * AUTH ENDPOINTS - Proxied to Backend
   */

  // Login
  app.post("/api/auth/login", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/auth/login")
  );

  // Register
  app.post("/api/auth/register", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/auth/register")
  );

  // Forgot password
  app.post("/api/auth/forgot-password", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/auth/forgot-password")
  );

  // Reset password
  app.post("/api/auth/reset-password", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/auth/reset-password")
  );

  // Verify OTP
  app.post("/api/auth/verify-otp", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/auth/verify-otp")
  );

  // Resend OTP
  app.post("/api/auth/resend-otp", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/auth/resend-otp")
  );

  /**
   * ADMIN ENDPOINTS - Proxied to Backend
   */

  // Admin users management
  app.get("/api/admin/admin-users", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/admin-users")
  );

  app.post("/api/admin/admin-users", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/admin/admin-users")
  );

  app.get("/api/admin/admin-users/pending/list", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/admin-users/pending/list")
  );

  app.get("/api/admin/admin-users/:id", (req, res) =>
    proxyToBackend(req, res, "GET", `/api/admin/admin-users/${req.params.id}`)
  );

  app.post("/api/admin/admin-users/:id/verify", (req, res) =>
    proxyToBackend(req, res, "POST", `/api/admin/admin-users/${req.params.id}/verify`)
  );

  app.put("/api/admin/admin-users/:id/details", (req, res) =>
    proxyToBackend(req, res, "PUT", `/api/admin/admin-users/${req.params.id}/details`)
  );

  app.put("/api/admin/admin-users/:id/deactivate", (req, res) =>
    proxyToBackend(req, res, "PUT", `/api/admin/admin-users/${req.params.id}/deactivate`)
  );

  app.put("/api/admin/admin-users/:id/reactivate", (req, res) =>
    proxyToBackend(req, res, "PUT", `/api/admin/admin-users/${req.params.id}/reactivate`)
  );

  // Role management
  app.put("/api/admin/admin-users/:id/promote-super-admin", (req, res) =>
    proxyToBackend(
      req,
      res,
      "PUT",
      `/api/admin/admin-users/${req.params.id}/promote-super-admin`
    )
  );

  app.put("/api/admin/admin-users/:id/role", (req, res) =>
    proxyToBackend(req, res, "PUT", `/api/admin/admin-users/${req.params.id}/role`)
  );

  // Delete admin user
  app.delete("/api/admin/admin-users/:id", (req, res) =>
    proxyToBackend(req, res, "DELETE", `/api/admin/admin-users/${req.params.id}`)
  );

  // User promotion
  app.get("/api/admin/eligible-users", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/eligible-users")
  );

  app.post("/api/admin/promote-user", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/admin/promote-user")
  );

  // User management
  app.get("/api/admin/users", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/users")
  );

  app.get("/api/admin/all-users", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/all-users")
  );

  app.put("/api/admin/users/:id/kyc-status", (req, res) =>
    proxyToBackend(req, res, "PUT", `/api/admin/users/${req.params.id}/kyc-status`)
  );

  // Roles (RBAC)
  app.get("/api/admin/roles", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/roles")
  );

  app.post("/api/admin/roles", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/admin/roles")
  );

  app.get("/api/admin/roles/:id", (req, res) =>
    proxyToBackend(req, res, "GET", `/api/admin/roles/${req.params.id}`)
  );

  app.put("/api/admin/roles/:id", (req, res) =>
    proxyToBackend(req, res, "PUT", `/api/admin/roles/${req.params.id}`)
  );

  app.delete("/api/admin/roles/:id", (req, res) =>
    proxyToBackend(req, res, "DELETE", `/api/admin/roles/${req.params.id}`)
  );

  // Role assignment endpoints
  app.post("/api/admin/users/:userId/assign-role", (req, res) =>
    proxyToBackend(
      req,
      res,
      "POST",
      `/api/admin/users/${req.params.userId}/assign-role`
    )
  );

  app.delete("/api/admin/users/:userId/remove-role", (req, res) =>
    proxyToBackend(
      req,
      res,
      "DELETE",
      `/api/admin/users/${req.params.userId}/remove-role`
    )
  );

  app.get("/api/admin/rbac/users", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/rbac/users")
  );

  app.get("/api/admin/users/:userId/permissions", (req, res) =>
    proxyToBackend(req, res, "GET", `/api/admin/users/${req.params.userId}/permissions`)
  );

  app.post("/api/admin/rbac/initialize", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/admin/rbac/initialize")
  );

  // Groups (RBAC)
  app.get("/api/admin/groups", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/groups")
  );

  app.post("/api/admin/groups", (req, res) =>
    proxyToBackend(req, res, "POST", "/api/admin/groups")
  );

  app.get("/api/admin/groups/:id", (req, res) =>
    proxyToBackend(req, res, "GET", `/api/admin/groups/${req.params.id}`)
  );

  app.put("/api/admin/groups/:id", (req, res) =>
    proxyToBackend(req, res, "PUT", `/api/admin/groups/${req.params.id}`)
  );

  app.delete("/api/admin/groups/:id", (req, res) =>
    proxyToBackend(req, res, "DELETE", `/api/admin/groups/${req.params.id}`)
  );

  app.post("/api/admin/groups/:groupId/add-member", (req, res) =>
    proxyToBackend(
      req,
      res,
      "POST",
      `/api/admin/groups/${req.params.groupId}/add-member`
    )
  );

  app.delete("/api/admin/groups/:groupId/remove-member/:userId", (req, res) =>
    proxyToBackend(
      req,
      res,
      "DELETE",
      `/api/admin/groups/${req.params.groupId}/remove-member/${req.params.userId}`
    )
  );

  app.put("/api/admin/groups/:groupId/members/:userId/permissions", (req, res) =>
    proxyToBackend(
      req,
      res,
      "PUT",
      `/api/admin/groups/${req.params.groupId}/members/${req.params.userId}/permissions`
    )
  );

  // Dashboard and reports
  app.get("/api/admin/dashboard", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/dashboard")
  );

  app.get("/api/admin/investors", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/investors")
  );

  app.get("/api/admin/investors/:id", (req, res) =>
    proxyToBackend(req, res, "GET", `/api/admin/investors/${req.params.id}`)
  );

  app.get("/api/admin/transactions", (req, res) => {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    proxyToBackend(req, res, "GET", `/api/admin/transactions?${query}`);
  });

  app.get("/api/admin/analytics", (req, res) => {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    proxyToBackend(req, res, "GET", `/api/admin/analytics?${query}`);
  });

  app.get("/api/admin/reports/earnings", (req, res) => {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    proxyToBackend(req, res, "GET", `/api/admin/reports/earnings?${query}`);
  });

  // Properties
  app.get("/api/admin/properties", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/properties")
  );

  // Security settings
  app.get("/api/admin/security-settings", (req, res) =>
    proxyToBackend(req, res, "GET", "/api/admin/security-settings")
  );

  app.put("/api/admin/security-settings", (req, res) =>
    proxyToBackend(req, res, "PUT", "/api/admin/security-settings")
  );

  /**
   * LOCAL DATA ENDPOINTS (NOT REQUIRING BACKEND)
   */

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
      const transactions = await storage.getTransactionsByInvestor(
        req.params.investorId
      );
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
        aiContext: null,
      });

      // Generate AI response (for now, mock response)
      const aiResponse = generateMockAiResponse(message, language);

      // Store AI response
      const aiMessage = await storage.createChatMessage({
        userId: userId || null,
        message: aiResponse,
        sender: "ai",
        aiContext: "response",
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