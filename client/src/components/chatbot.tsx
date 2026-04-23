import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Bot, AlertTriangle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotProps {
  role: "clinician" | "patient";
  isOpen: boolean;
  onClose: () => void;
}

const GREETING: Record<string, string> = {
  clinician:
    "Hi! I'm the Clear Skies MS Assistant. I can help you navigate the portal and answer clinical questions about Multiple Sclerosis. What would you like to know?",
  patient:
    "Hi! I'm the Clear Skies MS Assistant. I can help you use the app and answer questions about MS.\n\nRemember — always consult your clinician for medical decisions. What would you like to know?",
};

export function Chatbot({ role, isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: GREETING[role] },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, isOpen]);

  const mutation = useMutation({
    mutationFn: async (msgs: Message[]) => {
      const res = await apiRequest("POST", "/api/chat", { messages: msgs });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message ?? "Sorry, I could not process that." },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    },
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || mutation.isPending) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    mutation.mutate(next);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[55]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed top-16 right-4 z-[60] w-[380px] max-h-[calc(100vh-5rem)] bg-card border shadow-2xl rounded-2xl flex flex-col overflow-hidden"
        data-testid="chatbot-panel"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">MS Assistant</p>
              <p className="text-xs text-muted-foreground leading-tight capitalize">{role} view</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            data-testid="button-close-chatbot"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {role === "patient" && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
              General MS information only. Always consult your clinician or neurologist for medical decisions.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
                data-testid={`chat-message-${i}`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {mutation.isPending && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t px-3 py-2.5 shrink-0">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about MS or the app…"
              className="text-xs h-8 flex-1"
              data-testid="input-chat"
              disabled={mutation.isPending}
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={!input.trim() || mutation.isPending}
              data-testid="button-chat-send"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
