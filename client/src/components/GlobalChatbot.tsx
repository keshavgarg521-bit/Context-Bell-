import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function GlobalChatbot() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Detect lecture ID from URL
  useEffect(() => {
    const match = location.match(/\/session\/([^/]+)(?:\/|$)/);
    if (match) {
      setCurrentLectureId(match[1]);
    } else {
      setCurrentLectureId(null);
    }
  }, [location]);

  // Load chat history when opening
  useEffect(() => {
    if (isOpen && currentLectureId) {
      utils.ai.chatHistory.fetch({ lectureId: currentLectureId }).then((data) => {
        if (data && data.length > 0) {
          const messages: ChatMessage[] = data.map((m: any) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }));
          setLocalMessages(messages);
        }
      });
    }
  }, [isOpen, currentLectureId, utils]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setLocalMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: (err) => {
      console.error("Chat error:", err);
      toast.error("Failed to get AI response");
    },
  });

  const handleSendText = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: textToSend.trim() };
    const newMessages = [...localMessages, userMessage];
    setLocalMessages(newMessages);
    setInput("");

    chatMutation.mutate({
      lectureId: currentLectureId || undefined,
      messages: newMessages,
    });
  };

  const handleSend = () => {
    handleSendText(input);
  };

  if (!isAuthenticated) return null;

  const quickPrompts = [
    "How does ContextBell help me learn?",
    "Explain Laplace Transform shifting property",
    "Give me study tips for revision",
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg
          transition-all duration-200 z-50
          ${isOpen
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary text-primary-foreground hover:scale-105 cursor-pointer shadow-primary/20"
          }
        `}
        aria-label="Toggle AI Chatbot"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">ContextBell AI Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  {currentLectureId ? "Lecture Session Assistant Active" : "Global Study Assistant"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md hover:bg-secondary/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {localMessages.length === 0 ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Hi! I'm your AI Study Companion.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask me any question about your lecture, study concepts, or how to use ContextBell!
                  </p>
                </div>
                <div className="space-y-2 text-left pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Questions:</p>
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendText(prompt)}
                      disabled={chatMutation.isPending}
                      className="w-full text-left p-2 rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-xs text-foreground transition-colors cursor-pointer"
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              localMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-secondary/80 border border-border text-secondary-foreground rounded-bl-none"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-secondary/80 border border-border px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={currentLectureId ? "Ask about this lecture..." : "Ask any study or lecture question..."}
                disabled={chatMutation.isPending}
                className="h-10 text-sm"
              />
              <Button
                onClick={handleSend}
                size="sm"
                disabled={!input.trim() || chatMutation.isPending}
                className="h-10 w-10 p-0 cursor-pointer shrink-0"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
