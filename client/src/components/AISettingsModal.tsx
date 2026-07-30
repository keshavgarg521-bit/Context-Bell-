import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Key, Check, Bot } from "lucide-react";
import { toast } from "sonner";

export function AISettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const savedKey = localStorage.getItem("contextbell_ai_key") || "";
    const savedProvider = (localStorage.getItem("contextbell_ai_provider") as "openai" | "gemini") || "openai";
    setApiKey(savedKey);
    setProvider(savedProvider);
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("contextbell_ai_key", apiKey.trim());
      localStorage.setItem("contextbell_ai_provider", provider);
      toast.success(`Configured ${provider === "openai" ? "ChatGPT (OpenAI)" : "Google Gemini"} API key!`);
    } else {
      localStorage.removeItem("contextbell_ai_key");
      localStorage.removeItem("contextbell_ai_provider");
      toast.info("Cleared custom API key.");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Provider & API Key Setup
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Connect real ChatGPT (OpenAI) or Google Gemini to analyze your actual recorded lecture audio & transcripts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select AI Provider</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProvider("openai")}
                className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  provider === "openai"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="w-4 h-4" /> OpenAI / ChatGPT
              </button>
              <button
                type="button"
                onClick={() => setProvider("gemini")}
                className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  provider === "gemini"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-4 h-4" /> Google Gemini
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-primary" />
              {provider === "openai" ? "OpenAI API Key (sk-...)" : "Google Gemini API Key (AIzaSy...)"}
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "openai" ? "sk-proj-..." : "AIzaSy..."}
              className="text-xs h-10 font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Your API key is saved locally in your browser and used to analyze lecture audio & transcripts directly.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="cursor-pointer text-xs">
            <Check className="w-3.5 h-3.5 mr-1" /> Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
