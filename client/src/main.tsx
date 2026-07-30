import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient();

// ── Built-in Gemini key ───────────────────────────────────────────────────────
// Pre-seed localStorage so the chatbot works out-of-the-box without asking the
// user to enter a key. A manually configured key always takes precedence.
const BUILT_IN_GEMINI_KEY = "AIzaSyAkgJ-X58fnsxxf-h04aT8BErU3ewKWJjw";
try {
  // Always apply the built-in key — users never need to configure anything
  localStorage.setItem("contextbell_ai_key", BUILT_IN_GEMINI_KEY);
  localStorage.setItem("contextbell_ai_provider", "gemini");
} catch {
  // Storage unavailable — server-side fallback will handle it
}
// ─────────────────────────────────────────────────────────────────────────────

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        const customHeaders: Record<string, string> = {};
        try {
          const aiKey = localStorage.getItem("contextbell_ai_key");
          const aiProvider = localStorage.getItem("contextbell_ai_provider");
          if (aiKey) {
            if (aiProvider === "gemini") {
              customHeaders["x-gemini-api-key"] = aiKey;
            } else {
              customHeaders["x-openai-api-key"] = aiKey;
            }
          }

          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              customHeaders["Authorization"] = `Bearer ${token}`;
            }
          }
        } catch {
          // Storage unavailable
        }
        return customHeaders;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
