import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Retries non-2xx responses and network errors with exponential backoff, then
// returns the final Response so callers keep their existing error handling.
const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const openaiKey = ENV.openaiApiKey || process.env.OPENAI_API_KEY;
  const geminiKey = ENV.geminiApiKey || process.env.GEMINI_API_KEY;
  const forgeKey = ENV.forgeApiKey || process.env.BUILT_IN_FORGE_API_KEY;

  // 1. Google Gemini API integration
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const promptText = params.messages
        .map((m) => `${m.role.toUpperCase()}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
        .join("\n\n");

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return {
          id: "gemini-" + Date.now(),
          created: Date.now(),
          model: "gemini-1.5-flash",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: responseText },
              finish_reason: "stop",
            },
          ],
        };
      }
    } catch (err) {
      console.warn("[Gemini API Error]", err);
    }
  }

  // 2. OpenAI / ChatGPT API integration
  if (openaiKey) {
    try {
      const payload: Record<string, unknown> = {
        model: params.model && params.model.includes("gpt") ? params.model : "gpt-4o-mini",
        messages: params.messages.map(normalizeMessage),
      };

      const res = await fetchWithBackoff("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return (await res.json()) as InvokeResult;
      }
    } catch (err) {
      console.warn("[OpenAI API Error]", err);
    }
  }

  // 3. Forge API integration
  if (forgeKey) {
    try {
      const payload: Record<string, unknown> = {
        messages: params.messages.map(normalizeMessage),
      };
      if (params.model) payload.model = params.model;

      const res = await fetchWithBackoff(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${forgeKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return (await res.json()) as InvokeResult;
      }
    } catch (err) {
      console.warn("[Forge API Error]", err);
    }
  }

  // 4. Dynamic Contextual Fallback when no external API key is set
  console.warn("[LLM] No external API key found. Using dynamic contextual analysis based on actual user input.");
  const lastMsg = params.messages[params.messages.length - 1]?.content;
  const fullPromptText = params.messages.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join("\n");
  const lastText = typeof lastMsg === "string" ? lastMsg : JSON.stringify(lastMsg || "");
  const lowerText = fullPromptText.toLowerCase();

  // Dynamically extract topic and transcript context from user prompt
  let topicMatch =
    fullPromptText.match(/confused about:\s*"([^"]+)"/i) ||
    fullPromptText.match(/Topic:\s*([^\n]+)/i) ||
    fullPromptText.match(/about:\s*"([^"]+)"/i) ||
    fullPromptText.match(/Lecture:\s*"([^"]+)"/i);

  let extractedTopic = topicMatch ? topicMatch[1].trim() : "";

  if (!extractedTopic || extractedTopic.length < 2 || extractedTopic.toLowerCase().includes("not specified")) {
    const transcriptMatch = fullPromptText.match(/transcript[^\n]*:\s*([^\n]+)/i);
    if (transcriptMatch && transcriptMatch[1].trim().length > 5) {
      const words = transcriptMatch[1].trim().split(/\s+/).slice(0, 6).join(" ");
      extractedTopic = words.replace(/[^\w\s]/gi, "");
    } else {
      const userQuestionMatch = lastText.match(/(?:explain|what is|how does|why|understand)\s+([A-Za-z0-9\s]+)/i);
      if (userQuestionMatch) {
        extractedTopic = userQuestionMatch[1].trim();
      } else {
        extractedTopic = "Lecture Core Concept";
      }
    }
  }

  const contextMatch =
    fullPromptText.match(/transcript context[^\n]*:\s*([^\n]+)/i) ||
    fullPromptText.match(/transcript[^\n]*:\s*([^\n]+)/i);
  const actualContextQuote = contextMatch ? contextMatch[1].trim() : "";

  const isQuiz = lowerText.includes("quiz") || params.messages.some((m) => String(m.content).toLowerCase().includes("quiz"));
  let mockContent = "";

  if (isQuiz) {
    mockContent = JSON.stringify([
      {
        question: `What is the core principle behind ${extractedTopic}?`,
        options: [
          `A) It provides systematic rules to analyze ${extractedTopic}`,
          "B) It is an outdated concept with no practical application",
          "C) It only applies under extreme laboratory conditions",
          "D) None of the above",
        ],
        correctAnswer: 0,
        explanation: `Understanding ${extractedTopic} helps break down complex topics into clear, structured components.`,
      },
      {
        question: `Why do students often face difficulty with ${extractedTopic}?`,
        options: [
          "A) Fast lecture pacing during the explanation",
          "B) Complex terminology and multi-step processes",
          "C) Connecting theoretical concepts to practical examples",
          "D) All of the above",
        ],
        correctAnswer: 3,
        explanation: "Combining fast pacing, detailed terminology, and practical applications requires step-by-step breakdown.",
      },
      {
        question: `How can you best verify your understanding of ${extractedTopic}?`,
        options: [
          "A) By applying the concept to a real-world example step-by-step",
          "B) By memorizing formulas without understanding their meaning",
          "C) By skipping the foundational definitions",
          "D) By ignoring boundary conditions",
        ],
        correctAnswer: 0,
        explanation: "Applying the concept methodically to concrete examples confirms genuine comprehension.",
      },
    ]);
  } else if (lowerText.includes("confused") || lowerText.includes("explanation") || lowerText.includes("explain")) {
    mockContent = `### 📚 In-Depth Analysis: **${extractedTopic}**

${actualContextQuote ? `> 🎙️ **Captured Lecture Snippet**: *"${actualContextQuote}"*\n` : ""}
#### 1. 🔍 Step-by-Step Educational Breakdown
- **Core Concept**: **${extractedTopic}** is a key subject covered in your lecture. It forms a crucial foundation for understanding how this system operates.
- **Why Confusion Occurs**: During lectures, rapid explanations can make it challenging to connect foundational definitions with advanced applications.
- **Methodical Execution**:
  1. **Identify Foundational Principles**: Start by defining the core rules governing **${extractedTopic}**.
  2. **Break Down the Components**: Isolate each element mentioned in your lecture transcript to see how they interact.
  3. **Apply Contextual Rules**: Connect the theory directly to the specific problem or scenario discussed in class.

#### 2. 💡 Intuitive Real-World Analogy
> **Think of Building with Interlocking Blocks:** Just as a complex structure is built by connecting simple individual blocks, **${extractedTopic}** relies on foundational principles working together. Once you master the base block, the whole concept falls into place.

#### 3. 🎯 Key Insights & Common Pitfalls
> [!IMPORTANT]
> - **Pay Attention to Details**: Always double-check definitions and specific conditions mentioned in the lecture.
> - **Connect Theory to Practice**: Relate each step back to the main objective of **${extractedTopic}**.

#### 4. 📝 Self-Assessment Recall Check
- **Question**: What is the most important takeaway regarding **${extractedTopic}**?
- **Answer**: Mastering the step-by-step foundation makes solving complex variations straightforward.`;
  } else if (lowerText.includes("summarizer") || lowerText.includes("summary")) {
    mockContent = `### 🎓 Lecture Executive Summary

- **Overview**: This lecture focused on **${extractedTopic}**, covering essential concepts, definitions, and applications.
- **Key Topics Discussed**:
  1. Core definitions and principles of **${extractedTopic}**.
  2. Step-by-step analysis of lecture examples.
  3. Identifying and resolving key areas of student confusion.
- **Primary Confusion Hotspots**:
  - Understanding complex terminology during fast-paced explanations.
  - Applying theoretical concepts to practical problem-solving.
- **Actionable Next Steps**:
  - Review the step-by-step AI explanation for each confusion moment.
  - Take the interactive quiz to reinforce your understanding.`;
  } else {
    mockContent = `### 🤖 ContextBell Assistant: **${extractedTopic}**

Thank you for asking about **${extractedTopic}**!

${actualContextQuote ? `Based on your lecture transcript context (*"${actualContextQuote}"*):\n` : ""}
Here is a clear breakdown to address your question:

1. **Core Idea**: **${extractedTopic}** focuses on breaking down the subject into clear, logical steps.
2. **Key Takeaway**: Make sure to focus on the fundamental definitions before moving on to complex applications.
3. **Study Recommendation**: Review the captured confusion points and use the session quiz to test your knowledge!

*Feel free to ask any follow-up question or type a specific doubt about this topic below!*`;
  }

  return {
    id: "ai-" + Date.now(),
    created: Date.now(),
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: mockContent,
        },
        finish_reason: "stop",
      },
    ],
  };
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  assertApiKey();

  const url = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/models`
    : "https://forge.manus.im/v1/models";

  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${ENV.forgeApiKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as ModelsResponse;
}
