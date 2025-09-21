import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { storage } from './storage';
import { insertChatMessageSchema } from '@shared/schema';

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
}

interface WebSocketMessage {
  type: 'chat' | 'ping' | 'join' | 'typing';
  data?: {
    message?: string;
    userId?: string;
    language?: 'en' | 'ar';
  };
}

export class ChatWebSocketServer {
  private wss: WebSocketServer;
  private clients = new Map<string, ExtendedWebSocket>();

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws' // Only handle WebSocket connections on /ws path
    });
    
    this.wss.on('connection', (ws: ExtendedWebSocket, request: IncomingMessage) => {
      console.log('New WebSocket connection established');
      
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' }
          }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        // Remove from clients map
        this.clients.forEach((client, userId) => {
          if (client === ws) {
            this.clients.delete(userId);
          }
        });
      });

      

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Heartbeat to detect broken connections
    setInterval(() => {
      this.wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private async handleMessage(ws: ExtendedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'join':
        if (message.data?.userId) {
          ws.userId = message.data.userId;
          this.clients.set(message.data.userId, ws);
          
          // Send recent chat history
          const recentMessages = await storage.getChatMessagesByUser(message.data.userId);
          ws.send(JSON.stringify({
            type: 'history',
            data: { messages: recentMessages.slice(-20) } // Last 20 messages
          }));
        }
        break;

      case 'chat':
        await this.handleChatMessage(ws, message);
        break;

      case 'typing':
        // Broadcast typing indicator to other clients (if needed)
        this.broadcastToUser(ws.userId, {
          type: 'typing',
          data: { userId: ws.userId, typing: true }
        });
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  private async handleChatMessage(ws: ExtendedWebSocket, message: WebSocketMessage) {
    if (!message.data?.message) {
      return ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Message content is required' }
      }));
    }

    try {
      // Store user message
      const userMessage = await storage.createChatMessage({
        userId: ws.userId || null,
        message: message.data.message,
        sender: 'user',
        aiContext: null
      });

      // Broadcast user message immediately
      ws.send(JSON.stringify({
        type: 'message',
        data: userMessage
      }));

      // Generate AI response
      const aiResponse = await this.generateAiResponse(
        message.data.message, 
        message.data.language || 'en'
      );

      // Store AI response
      const aiMessage = await storage.createChatMessage({
        userId: ws.userId || null,
        message: aiResponse,
        sender: 'ai',
        aiContext: 'response'
      });

      // Send AI response with typing delay for realism
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'message',
          data: aiMessage
        }));
      }, 1000 + Math.random() * 2000); // 1-3 second delay

    } catch (error) {
      console.error('Error handling chat message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Failed to process message' }
      }));
    }
  }

  private async generateAiResponse(userMessage: string, language: string): Promise<string> {
    // For now, use enhanced mock responses
    // TODO: Replace with real OpenAI integration
    const lowerMessage = userMessage.toLowerCase();
    
    // Context-aware responses based on real estate domain
    if (lowerMessage.includes('dashboard') || lowerMessage.includes('overview') || lowerMessage.includes('لوحة')) {
      return language === 'ar' 
        ? '📊 مرحباً! لوحة التحكم تُظهر حالياً 127 مستثمر نشط و45 عقار متاح. نسبة نمو الاستثمارات هذا الشهر 8.3%. هل تريد تفاصيل أكثر عن قطاع معين؟'
        : '📊 Hello! Your dashboard shows 127 active investors and 45 available properties. Investment growth this month is 8.3%. Would you like details about a specific sector?';
    } 
    
    else if (lowerMessage.includes('property') || lowerMessage.includes('عقار') || lowerMessage.includes('استثمار')) {
      return language === 'ar'
        ? '🏢 لدينا فرص استثمارية ممتازة! العقارات السكنية في الرياض تحقق عائد 9.2%، والتجارية في جدة 11.5%. أفضل الفرص حالياً في القطاع التجاري. أي نوع عقار يهمك؟'
        : '🏢 We have excellent investment opportunities! Residential properties in Riyadh yield 9.2%, commercial in Jeddah 11.5%. Best current opportunities are in commercial sector. What property type interests you?';
    } 
    
    else if (lowerMessage.includes('kyc') || lowerMessage.includes('verification') || lowerMessage.includes('توثيق')) {
      return language === 'ar'
        ? '✅ حالة KYC: 12 طلب في انتظار المراجعة، 8 تمت الموافقة عليها اليوم. متوسط وقت المعالجة 2.4 يوم. نسبة الموافقة 94%. هل تحتاج مراجعة طلب معين؟'
        : '✅ KYC Status: 12 pending review, 8 approved today. Average processing time 2.4 days. Approval rate 94%. Do you need to review a specific application?';
    }
    
    else if (lowerMessage.includes('analytics') || lowerMessage.includes('report') || lowerMessage.includes('تقرير')) {
      return language === 'ar'
        ? '📈 التحليلات الذكية تُظهر: ارتفاع طلبات الاستثمار السكني 23%، انخفاض المخاطر للمحفظة الحالية، توقع نمو 15% للربع القادم. تريد تقرير مفصل؟'
        : '📈 Smart analytics show: 23% increase in residential investment requests, decreased risk for current portfolio, projected 15% growth next quarter. Want a detailed report?';
    }
    
    else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('مرحبا') || lowerMessage.includes('السلام')) {
      return language === 'ar'
        ? '👋 أهلاً وسهلاً! أنا مساعدك الذكي لمنصة زارون العقارية. يمكنني مساعدتك في إدارة الاستثمارات، مراجعة بيانات العملاء، وتحليل الأداء. كيف يمكنني خدمتك اليوم؟'
        : '👋 Welcome! I\'m your AI assistant for Zaron Real Estate Platform. I can help you manage investments, review customer data, and analyze performance. How can I assist you today?';
    }
    
    else {
      return language === 'ar'
        ? '🤖 شكراً لك على سؤالك. أنا هنا لمساعدتك في جميع أمور الاستثمار العقاري. يمكنني مساعدتك في: 📊 تحليل البيانات، 👥 إدارة العملاء، 🏢 مراجعة العقارات، 📈 التقارير المالية. ما الذي تود معرفته؟'
        : '🤖 Thank you for your question. I\'m here to help with all real estate investment matters. I can assist with: 📊 Data analysis, 👥 Customer management, 🏢 Property reviews, 📈 Financial reports. What would you like to know?';
    }
  }

  private broadcastToUser(userId: string | undefined, message: any) {
    if (!userId) return;
    
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  public broadcastToAll(message: any) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}