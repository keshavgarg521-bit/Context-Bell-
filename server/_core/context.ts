import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const headerOpenAI = opts.req.headers["x-openai-api-key"];
  const headerGemini = opts.req.headers["x-gemini-api-key"];
  if (typeof headerOpenAI === "string" && headerOpenAI.trim()) {
    process.env.OPENAI_API_KEY = headerOpenAI.trim();
  }
  if (typeof headerGemini === "string" && headerGemini.trim()) {
    process.env.GEMINI_API_KEY = headerGemini.trim();
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
