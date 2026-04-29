"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { chatApi, ChatMessage, ConversationDetail } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";

interface ChatPanelProps {
  programmerId: string;
  programmerName: string;
  programmerGithub?: string | null;
  onClose: () => void;
}

export function ChatPanel({ 
  programmerId, 
  programmerName, 
  programmerGithub,
  onClose 
}: ChatPanelProps) {
  const { token, user } = useAuthStore();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Initialize conversation and WebSocket
  useEffect(() => {
    let isMounted = true;
    let wsInstance: WebSocket | null = null;
    
    const initChat = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get or create conversation
        const conv = await chatApi.getOrCreateConversation(programmerId);
        if (!isMounted) return;
        
        setConversation(conv);
        setMessages(conv.messages);
        
        // Connect WebSocket
        if (token) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const wsUrl = apiUrl.replace(/^http/, "ws") + "/chat/ws?token=" + token;
          const ws = new WebSocket(wsUrl);
          wsInstance = ws;
          
          ws.onopen = () => {
            if (isMounted) {
              console.log("WebSocket connected");
            }
          };
          
          ws.onmessage = (event) => {
            if (!isMounted) return;
            const data = JSON.parse(event.data);
            
            if (data.type === "new_message" && data.data.conversation_id === conv.id) {
              const newMsg: ChatMessage = {
                id: data.data.id,
                conversation_id: data.data.conversation_id,
                sender_id: data.data.sender_id,
                sender_name: data.data.sender_name,
                content: data.data.content,
                is_read: false,
                created_at: data.data.created_at,
                is_own_message: false,
              };
              setMessages(prev => [...prev, newMsg]);
              
              // Mark as read
              chatApi.markAsRead(conv.id);
            }
            
            if (data.type === "typing" && data.data.conversation_id === conv.id) {
              setIsTyping(true);
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
            }
          };
          
          ws.onerror = () => {
            if (isMounted && ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
              console.error("WebSocket connection error");
            }
          };
          
          ws.onclose = () => {
            if (isMounted) {
              console.log("WebSocket disconnected");
            }
          };
          
          wsRef.current = ws;
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load conversation");
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initChat();

    return () => {
      isMounted = false;
      if (wsInstance && (wsInstance.readyState === WebSocket.OPEN || wsInstance.readyState === WebSocket.CONNECTING)) {
        wsInstance.close();
      }
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [programmerId, token]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversation || isSending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    // Optimistic update
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: user?.id || "",
      sender_name: user?.name || "",
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      is_own_message: true,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const sentMessage = await chatApi.sendMessage(conversation.id, content);
      // Replace temp message with real one
      setMessages(prev => 
        prev.map(m => m.id === tempMessage.id ? sentMessage : m)
      );
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sendTypingIndicator = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && conversation) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        conversation_id: conversation.id,
      }));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[500px] w-[380px] flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {programmerName}
            </h3>
            {programmerGithub && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                @{programmerGithub}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-red-500">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Start a conversation with {programmerName}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_own_message ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.is_own_message
                      ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      message.is_own_message
                        ? "text-white/70"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              sendTypingIndicator();
            }}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isLoading || isSending}
            className="shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
