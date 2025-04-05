import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

type WebSocketContextType = {
  connected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any | null;
  notifications: Notification[];
  clearNotifications: () => void;
};

type Notification = {
  id: string;
  type: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const webSocketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Initialize WebSocket connection
  useEffect(() => {
    // Do not connect if the user is not logged in
    if (!user) {
      return;
    }

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${Date.now()}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    webSocketRef.current = ws;
    
    // Setup event handlers
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setConnected(true);
      
      // Authenticate with the WebSocket server
      if (user) {
        sendAuthMessage(user.id);
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        setLastMessage(message);
        
        // Handle different message types
        switch (message.type) {
          case 'connected':
            console.log('Successfully connected to notification server');
            break;
            
          case 'auth_success':
            console.log('WebSocket authentication successful');
            break;
            
          case 'pdf_processing_complete':
            toast({
              title: 'PDF Processing Complete',
              description: message.message,
              variant: 'default',
            });
            addNotification(message);
            break;
            
          case 'pdf_processing_error':
            toast({
              title: 'PDF Processing Error',
              description: message.message,
              variant: 'destructive',
            });
            addNotification(message);
            break;
            
          default:
            // Add other types of notifications to the notifications list
            if (message.type && message.message) {
              addNotification(message);
            }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setConnected(false);
    };
    
    // Cleanup function to close the WebSocket connection when the component unmounts
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [user?.id, toast]);
  
  // Function to send authentication message
  const sendAuthMessage = (userId: number) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify({
        type: 'auth',
        userId: userId
      }));
    }
  };
  
  // Add a notification to the list
  const addNotification = (message: any) => {
    const newNotification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: message.type,
      message: message.message,
      data: message.data,
      timestamp: message.data?.timestamp || new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50 notifications
  };
  
  // Function to send a message through the WebSocket
  const sendMessage = (message: any) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };
  
  // Function to clear notifications
  const clearNotifications = () => {
    setNotifications([]);
  };
  
  return (
    <WebSocketContext.Provider value={{ 
      connected, 
      sendMessage, 
      lastMessage, 
      notifications,
      clearNotifications
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};