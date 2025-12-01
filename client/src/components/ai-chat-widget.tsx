import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageCircle, Send, Minimize2, Maximize2, Bot, Sparkles, TrendingUp, AlertTriangle, Users, Wifi, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessage {
  id: string
  message: string
  sender: 'user' | 'ai'
  timestamp: Date
  aiContext?: string
  createdAt?: Date
  userId?: string | null
}

interface AiSuggestion {
  type: 'market' | 'customer' | 'risk' | 'opportunity'
  title: string
  description: string
  confidence: number
}

export function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      message: 'مرحباً! أنا زارون، مساعدك الذكي للاستثمار العقاري. كيف يمكنني مساعدتك اليوم؟\n\nHello! I\'m Zaron, your smart real estate investment assistant. How can I help you today?',
      sender: 'ai',
      timestamp: new Date(),
      aiContext: 'greeting'
    }
  ])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const wsRef = useRef<WebSocket | null>(null)
  const [suggestions] = useState<AiSuggestion[]>([
    {
      type: 'market',
      title: 'Market Opportunity',
      description: 'High demand detected in Riyadh residential sector',
      confidence: 0.89
    },
    {
      type: 'risk',
      title: 'Risk Alert',
      description: '3 pending KYC reviews require attention',
      confidence: 0.95
    }
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // WebSocket connection effect
  useEffect(() => {
    if (isOpen) {
      connectWebSocket()
    } else {
      disconnectWebSocket()
    }
    
    return () => {
      disconnectWebSocket()
    }
  }, [isOpen])

  const connectWebSocket = () => {
    try {
      const wsUrl = `wss://zeron-backend-z5o1.onrender.com/ws`
      
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        
        // Join the chat session
        wsRef.current?.send(JSON.stringify({
          type: 'join',
          data: { userId: 'admin-user' }
        }))
      }
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      }
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          if (isOpen) {
            connectWebSocket()
          }
        }, 3000)
      }
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setIsConnected(false)
    }
  }
  
  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setIsConnected(false)
    }
  }
  
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'message':
        const newMessage: ChatMessage = {
          ...data.data,
          timestamp: new Date(data.data.createdAt || new Date())
        }
        setMessages(prev => [...prev, newMessage])
        setIsTyping(false)
        break
        
      case 'history':
        const historyMessages = data.data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.createdAt || new Date())
        }))
        setMessages(prev => [...prev, ...historyMessages])
        break
        
      case 'typing':
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 3000)
        break
        
      case 'error':
        console.error('Chat error:', data.data.message)
        setIsTyping(false)
        break
    }
  }

  const handleSendMessage = () => {
    if (!message.trim() || !isConnected) return

    const messageText = message.trim()
    setMessage('')
    setIsTyping(true)

    try {
      // Send message via WebSocket
      wsRef.current?.send(JSON.stringify({
        type: 'chat',
        data: {
          message: messageText,
          userId: 'admin-user',
          language
        }
      }))
    } catch (error) {
      console.error('Error sending message:', error)
      setIsTyping(false)
      
      // Fallback to mock response if WebSocket fails
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        message: messageText,
        sender: 'user',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message: getAiResponse(messageText),
          sender: 'ai',
          timestamp: new Date(),
          aiContext: 'response'
        }
        setMessages(prev => [...prev, aiResponse])
        setIsTyping(false)
      }, 1000)
    }
  }

  const getAiResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()
    
    if (lowerMessage.includes('dashboard') || lowerMessage.includes('overview')) {
      return 'أرى أنك تسأل عن لوحة التحكم. حالياً لديك 2,847 مستخدماً نشطاً و 24 عقاراً متاحاً للاستثمار. هل تود معرفة المزيد عن أي إحصائية محددة؟\n\nI see you\'re asking about the dashboard. Currently you have 2,847 active users and 24 properties available for investment. Would you like to know more about any specific metric?'
    } else if (lowerMessage.includes('property') || lowerMessage.includes('عقار')) {
      return 'بخصوص العقارات، لدينا فرص استثمارية ممتازة في الرياض وجدة. أنصح بالنظر في المجمع السكني الفاخر بالرياض - عائد متوقع 8.5%. هل تود تفاصيل أكثر؟\n\nRegarding properties, we have excellent investment opportunities in Riyadh and Jeddah. I recommend looking at the Luxury Residential Complex in Riyadh - expected 8.5% yield. Would you like more details?'
    } else if (lowerMessage.includes('kyc') || lowerMessage.includes('verification')) {
      return 'لديك 3 طلبات KYC في انتظار المراجعة. معدل الموافقة الحالي 94%. أنصح بمراجعة طلب فاطمة القاسمي أولاً - مستندات كاملة.\n\nYou have 3 KYC requests pending review. Current approval rate is 94%. I recommend reviewing Fatima Al-Qasimi\'s application first - complete documentation.'
    } else if (lowerMessage.includes('market') || lowerMessage.includes('سوق')) {
      return 'تحليل السوق يشير إلى نمو قوي في القطاع السكني (+12%). أنصح بزيادة التركيز على عقارات الرياض. هل تود تقرير السوق الكامل؟\n\nMarket analysis shows strong growth in residential sector (+12%). I recommend increasing focus on Riyadh properties. Would you like the full market report?'
    } else {
      return 'شكراً لك على سؤالك. أنا أتعلم باستمرار لأقدم لك أفضل المساعدة في إدارة استثماراتك العقارية. هل يمكنك توضيح كيف يمكنني مساعدتك؟\n\nThank you for your question. I\'m continuously learning to provide you the best assistance in managing your real estate investments. Could you clarify how I can help you?'
    }
  }

  if (!isOpen) {
    return (
      <motion.div 
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full neon-glow hover:scale-110 transition-transform duration-300 bg-gradient-to-r from-primary to-primary/70"
          data-testid="button-open-chat"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className={`fixed bottom-6 right-6 z-50 ${isMinimized ? 'w-80' : 'w-96'}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Card className="glass-morphism border-2 border-primary/20 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/30">
              <AvatarFallback className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground">
                🇸🇦
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                زارون Zaron
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">AI Investment Assistant</p>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="h-8 w-8 p-0"
              title="Switch Language"
            >
              {language === 'ar' ? '🇬🇧' : '🇸🇦'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${isConnected ? 'text-green-600' : 'text-red-600'}`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            >
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
              data-testid="button-close-chat"
            >
              ×
            </Button>
          </div>
        </CardHeader>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <CardContent className="p-0">
                {/* AI Suggestions */}
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Insights</span>
                  </div>
                  <div className="grid gap-2">
                    {suggestions.map((suggestion, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                        data-testid={`ai-suggestion-${index}`}
                      >
                        <div className="flex items-center gap-2">
                          {suggestion.type === 'market' && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {suggestion.type === 'risk' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {suggestion.type === 'customer' && <Users className="h-4 w-4 text-blue-600" />}
                          <div>
                            <p className="text-sm font-medium">{suggestion.title}</p>
                            <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div className="h-80 overflow-y-auto p-4 space-y-4 modern-scrollbar">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.sender === 'ai' && (
                          <Avatar className="h-6 w-6 border border-primary/20">
                            <AvatarFallback className="bg-gradient-to-r from-primary/20 to-primary/10 text-xs">
                              🇸🇦
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`p-3 rounded-lg whitespace-pre-line ${
                            msg.sender === 'user'
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted'
                          }`}
                          data-testid={`message-${msg.id}`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-start gap-2 max-w-[80%]">
                        <Avatar className="h-6 w-6 border border-primary/20">
                          <AvatarFallback className="bg-gradient-to-r from-primary/20 to-primary/10 text-xs">
                            🇸🇦
                          </AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-1">
                            <span className="text-sm">
                              {language === 'ar' ? 'يكتب...' : 'Typing...'}
                            </span>
                            <div className="flex gap-1">
                              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={!isConnected}
                      data-testid="input-chat-message"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      className="neon-glow"
                      disabled={!message.trim() || !isConnected}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {isConnected ? (
                      language === 'ar' 
                        ? 'مدعوم بالذكاء الاصطناعي • يجيب بالعربية والإنجليزية'
                        : 'Powered by AI • Responds in Arabic & English'
                    ) : (
                      language === 'ar'
                        ? 'غير متصل • جاري إعادة الاتصال...'
                        : 'Offline • Reconnecting...'
                    )}
                  </p>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}