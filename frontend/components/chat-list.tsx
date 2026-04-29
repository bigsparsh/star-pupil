"use client";

import { useEffect, useState } from "react";
import { chatApi, Conversation } from "@/lib/api";
import { useRecruiterStore, SavedCandidate } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Loader2, UserPlus } from "lucide-react";

interface ChatListProps {
  onSelectConversation: (conv: Conversation) => void;
  onStartNewChat?: (candidate: SavedCandidate) => void;
  selectedId?: string;
  showSavedCandidates?: boolean;
}

export function ChatList({ onSelectConversation, onStartNewChat, selectedId, showSavedCandidates = true }: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { savedCandidates } = useRecruiterStore();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const convs = await chatApi.getConversations();
        setConversations(convs);
      } catch (err) {
        setError("Failed to load conversations");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
    
    // Poll for new conversations every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Find saved candidates without existing conversations
  const candidatesWithoutConversations = showSavedCandidates 
    ? savedCandidates.filter(
        (candidate) => !conversations.some((conv) => conv.other_user_id === candidate.id)
      )
    : [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (conversations.length === 0 && candidatesWithoutConversations.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center p-6">
        <MessageCircle className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No conversations yet
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Save candidates from Search to message them
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {/* Existing conversations */}
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectConversation(conv)}
          className={`w-full p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
            selectedId === conv.id ? "bg-violet-50 dark:bg-violet-900/20" : ""
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold">
              {conv.other_user_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {conv.other_user_name}
                </span>
                {conv.last_message_at && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {conv.other_user_github && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  @{conv.other_user_github}
                </p>
              )}
              {conv.last_message && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 truncate">
                  {conv.last_message}
                </p>
              )}
            </div>
            {conv.unread_count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 text-xs font-medium text-white">
                {conv.unread_count}
              </span>
            )}
          </div>
        </button>
      ))}
      
      {/* Saved candidates without conversations */}
      {candidatesWithoutConversations.length > 0 && (
        <>
          <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Saved Candidates
            </p>
          </div>
          {candidatesWithoutConversations.map((candidate) => (
            <button
              key={candidate.id}
              onClick={() => onStartNewChat?.(candidate)}
              className="w-full p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
                  {candidate.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {candidate.name}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                      Start chat
                    </span>
                  </div>
                  {candidate.github_username && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      @{candidate.github_username}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500 truncate">
                    {candidate.skills?.slice(0, 3).join(", ") || "No skills listed"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
