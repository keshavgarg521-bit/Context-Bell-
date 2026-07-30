import type { CapturedMoment, MomentExplanation, QuizQuestion } from "./types";

export function generateExplanation(moment: CapturedMoment): MomentExplanation {
  const topic = moment.topic;
  return {
    simple: `${topic} is a core concept where students often lose track of how the pieces connect. Based on what was said at ${moment.quote.slice(0, 60)}…, the key idea is understanding the transformation step-by-step rather than memorizing formulas.`,
    steps: [
      `Identify the starting point mentioned in the lecture (${topic})`,
      "Break the problem into smaller sub-steps the professor walked through",
      "Apply the relevant rule or property at each sub-step",
      "Check your result against the lecture example or boundary condition",
      "Connect this step back to the broader lecture topic",
    ],
    analogy: `Think of ${topic} like following a recipe — each ingredient (step) must be added in order, or the final dish won't make sense.`,
    important: `The most common mistake with ${topic} is skipping the setup step. Always verify the initial conditions before applying any transform or rule.`,
  };
}

export function generateLectureSummary(title: string, moments: CapturedMoment[]): string {
  const topics = [...new Set(moments.map((m) => m.topic))];
  const confusionCount = moments.length;

  return `## ${title} — Lecture Summary

This lecture covered fundamental concepts${topics.length ? ` including **${topics.join("**, **")}**` : ""}.

### Key Takeaways
1. The lecture progressed through core theory with practical examples at each stage.
2. ${confusionCount > 0 ? `${confusionCount} confusion moment${confusionCount > 1 ? "s were" : " was"} captured — these highlight areas worth revisiting.` : "No confusion moments were captured during this session."}
3. Focus revision on the topics where you pressed the bell, as those represent your personal knowledge gaps.

### Topics Covered
${topics.map((t, i) => `${i + 1}. **${t}** — ${moments.filter((m) => m.topic === t).length} confusion point(s)`).join("\n")}

### Recommended Next Steps
- Review each captured moment with its 30-second audio clip
- Use the AI chatbot to ask follow-up questions on weak topics
- Complete the quiz generated from your confusion points
- Revisit lecture slides for topics marked as unresolved`;
}

export function generateQuizFromMoments(moments: CapturedMoment[]): QuizQuestion[] {
  const source = moments.length > 0 ? moments : [
    { id: "default", topic: "Laplace Transform", quote: "Source transformation", timestamp: 0, status: "unresolved" as const },
  ];

  return source.slice(0, 5).map((m, i) => ({
    id: `q-${m.id}`,
    topic: m.topic,
    question: `What is the main concept behind "${m.topic}" as discussed when you were confused?`,
    options: [
      `Understanding the step-by-step process of ${m.topic}`,
      `Memorizing formulas without context`,
      `Skipping directly to the final answer`,
      `Ignoring boundary conditions`,
    ],
    correctIndex: 0,
    explanation: `The correct approach to ${m.topic} is understanding each step in sequence, as explained in your captured moment.`,
  }));
}

export function generateChatResponse(message: string, context: { title: string; moments: CapturedMoment[] }): string {
  const lower = message.toLowerCase();
  const topics = context.moments.map((m) => m.topic).join(", ");

  if (lower.includes("summary") || lower.includes("lecture")) {
    return `This lecture on **${context.title}** covered ${topics || "several topics"}. You captured ${context.moments.length} confusion moment(s). Would you like me to explain any specific topic in detail?`;
  }

  if (lower.includes("confusion") || lower.includes("bell") || lower.includes("moment")) {
    if (context.moments.length === 0) {
      return "You haven't captured any confusion moments yet. Press the bell icon whenever you feel lost during the lecture!";
    }
    const list = context.moments.map((m, i) => `${i + 1}. **${m.topic}** — "${m.quote.slice(0, 50)}…"`).join("\n");
    return `Here are your confusion moments:\n\n${list}\n\nClick any moment to see the 90-second recording and step-by-step explanation.`;
  }

  if (lower.includes("quiz")) {
    return `I've prepared a quiz based on your ${context.moments.length} confusion point(s). Head to the **Quiz** tab after the lecture to test your understanding!`;
  }

  const matched = context.moments.find(
    (m) => lower.includes(m.topic.toLowerCase()) || m.topic.toLowerCase().split(" ").some((w) => lower.includes(w))
  );

  if (matched) {
    const exp = generateExplanation(matched);
    return `**${matched.topic}**\n\n${exp.simple}\n\n**Steps:**\n${exp.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n**Analogy:** ${exp.analogy}`;
  }

  return `I'm here to help with **${context.title}**. You can ask me about:\n- Any topic from the lecture\n- Your confusion moments (${context.moments.length} captured)\n- Step-by-step explanations\n- Quiz preparation\n\nWhat would you like to know?`;
}
