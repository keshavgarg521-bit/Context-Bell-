import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { KeyRound, X, CheckCircle, AlertTriangle, Eye, EyeOff, ChevronDown, Sparkles } from "lucide-react";

/**
 * AIKeySetup — Floating widget to configure the user's AI provider API key.
 * Keys are stored in localStorage and sent to the server via tRPC headers
 * (x-openai-api-key or x-gemini-api-key) on every request.
 */
export default function AIKeySetup() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"openai" | "gemini">("gemini");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // On mount, load existing key from localStorage
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("contextbell_ai_key") ?? "";
      const storedProvider = localStorage.getItem("contextbell_ai_provider") ?? "gemini";
      if (storedKey) {
        setHasKey(true);
        setApiKey(storedKey);
        setProvider(storedProvider as "openai" | "gemini");
      }
    } catch {
      // Storage not available
    }
  }, []);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem("contextbell_ai_key", trimmed);
      localStorage.setItem("contextbell_ai_provider", provider);
      setHasKey(true);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setIsOpen(false);
      }, 1500);
    } catch {
      // Storage write failed
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem("contextbell_ai_key");
      localStorage.removeItem("contextbell_ai_provider");
      setApiKey("");
      setHasKey(false);
      setSaved(false);
    } catch {
      // Storage clear failed
    }
  };

  const maskedKey = apiKey
    ? apiKey.slice(0, 8) + "••••••••••••••••" + apiKey.slice(-4)
    : "";

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-20 right-5 z-50 flex flex-col items-end gap-2">
        {/* No-key warning badge */}
        {!hasKey && !isOpen && (
          <div
            className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400
                        text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm cursor-pointer
                        animate-pulse shadow-lg"
            onClick={() => setIsOpen(true)}
          >
            <AlertTriangle className="w-3 h-3" />
            Set AI API Key for real explanations
          </div>
        )}

        <button
          onClick={() => setIsOpen((v) => !v)}
          title={hasKey ? "AI Key configured ✓" : "Configure AI API Key"}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center shadow-xl
            border transition-all duration-300 cursor-pointer
            ${hasKey
              ? "bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-400"
              : "bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30 text-yellow-400"
            }
          `}
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : hasKey ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <KeyRound className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Settings panel */}
      {isOpen && (
        <div className="fixed bottom-36 right-5 z-50 w-80 rounded-2xl border border-border/60
                        bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">AI Provider Setup</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your <strong>Gemini</strong> or <strong>OpenAI</strong> API key so ContextBell
              can generate real in-depth AI explanations from your lecture transcript.
            </p>

            {/* Provider selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setProvider("gemini")}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer
                    ${provider === "gemini"
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                >
                  🤖 Google Gemini
                  <div className="text-[10px] font-normal mt-0.5 opacity-70">gemini-1.5-flash</div>
                </button>
                <button
                  onClick={() => setProvider("openai")}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer
                    ${provider === "openai"
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                >
                  ✨ OpenAI GPT
                  <div className="text-[10px] font-normal mt-0.5 opacity-70">gpt-4o-mini</div>
                </button>
              </div>
            </div>

            {/* API Key input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={provider === "gemini" ? "AIza..." : "sk-proj-..."}
                  className="w-full px-3 py-2 pr-9 rounded-lg bg-secondary border border-border text-sm
                             outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground
                             hover:text-foreground transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {hasKey && (
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Key saved: {maskedKey}
                </p>
              )}
            </div>

            {/* Get key links */}
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              {provider === "gemini" ? (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  Get free Gemini key at aistudio.google.com →
                </a>
              ) : (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  Get OpenAI key at platform.openai.com →
                </a>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!apiKey.trim() || saved}
                className="flex-1 cursor-pointer h-8 text-xs"
              >
                {saved ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Saved!
                  </span>
                ) : (
                  "Save Key"
                )}
              </Button>
              {hasKey && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClear}
                  className="cursor-pointer h-8 text-xs text-destructive border-destructive/40
                             hover:bg-destructive/10"
                >
                  Clear
                </Button>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center">
              🔒 Key stored locally in your browser only. Never sent anywhere except the AI provider.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
