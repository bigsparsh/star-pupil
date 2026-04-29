"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { chatApi, ChatMessage, Conversation, ConversationDetail } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { ChatList } from "@/components/chat-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Send, Loader2, ArrowLeft, Briefcase } from "lucide-react";

export default function ProgrammerMessagesPage() {
  const { token, user } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsUrl = apiUrl.replace(/^http/, "ws") + "/chat/ws?token=" + token;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (isMounted) {
        console.log("WebSocket connected");
      }
    };

    ws.onmessage = (event) => {
      if (!isMounted) return;
      const data = JSON.parse(event.data);

      if (data.type === "new_message") {
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
      }

      if (data.type === "typing") {
        setIsTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    };

    ws.onerror = () => {
      // Only log errors if we're still mounted (not a Strict Mode cleanup)
      if (isMounted && ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        console.error("WebSocket connection error");
      }
    };

    wsRef.current = ws;

    return () => {
      isMounted = false;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [token]);

  // Load conversation details when selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadConversation = async () => {
      setIsLoading(true);
      try {
        const detail = await chatApi.getConversation(selectedConversation.id);
        setConversationDetail(detail);
        setMessages(detail.messages);
      } catch (err) {
        console.error("Failed to load conversation:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setConversationDetail(null);
    setMessages([]);
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setConversationDetail(null);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: user?.id || "",
      sender_name: user?.name || "",
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      is_own_message: true,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const sentMessage = await chatApi.sendMessage(selectedConversation.id, content);
      setMessages(prev =>
        prev.map(m => m.id === tempMessage.id ? sentMessage : m)
      );
    } catch (err) {
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
    if (wsRef.current?.readyState === WebSocket.OPEN && selectedConversation) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        conversation_id: selectedConversation.id,
      }));
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Messages
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Chat with recruiters who are interested in your profile
        </p>
      </div>

      <div className="flex h-full rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 ${
          selectedConversation ? "hidden md:block" : ""
        }`}>
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Recruiters
            </h2>
          </div>
          <div className="overflow-y-auto h-[calc(100%-57px)]">
            <ChatList
              onSelectConversation={handleSelectConversation}
              selectedId={selectedConversation?.id}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${
          !selectedConversation ? "hidden md:flex" : "flex"
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <button
                  onClick={handleBack}
                  className="md:hidden rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedConversation.other_user_name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Recruiter
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageCircle className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      No messages yet
                    </p>
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                      The recruiter will start the conversation
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
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            message.is_own_message
                              ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white"
                              : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
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
              <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
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
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <MessageCircle className="h-16 w-16 text-zinc-300 dark:text-zinc-600" />
              <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Select a conversation
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
