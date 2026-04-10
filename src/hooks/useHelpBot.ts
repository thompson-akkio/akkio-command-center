import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi! I'm the Akkio POC Help Bot. Ask me anything about the required documents, the POC process, or Akkio's features.",
  },
];

export function useHelpBot(teamId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        if (!supabase) {
          // Mock fallback when Supabase is not configured
          await new Promise((r) => setTimeout(r, 800));
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content:
                "This is a mock response. Connect Supabase to enable real AI responses.",
            },
          ]);
          return;
        }

        // Build conversation history (exclude welcome message)
        const history = messages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        const { data, error: fnError } = await supabase.functions.invoke(
          "help-bot",
          {
            body: {
              message: content,
              teamId,
              conversationHistory: history,
            },
          }
        );

        if (fnError) throw new Error(fnError.message || "Request failed");

        const result = typeof data === "string" ? JSON.parse(data) : data;
        if (result.error) throw new Error(result.error);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: result.response,
          },
        ]);
      } catch (err) {
        const errMsg = (err as Error).message;
        setError(errMsg);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Sorry, I encountered an error. Please try again.`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [teamId, messages, isLoading]
  );

  const clearHistory = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearHistory };
}
