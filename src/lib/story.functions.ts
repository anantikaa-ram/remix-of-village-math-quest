import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createResponsesCall } from "./ai/responses.ts";

const inputSchema = z.object({
  name: z.string().max(60),
  villageName: z.string().max(60),
  grade: z.string().max(20),
  xp: z.number(),
  coins: z.number(),
  badges: z.array(z.string()).max(20),
  overallMastery: z.number(),
  strongest: z.array(z.object({ topic: z.string(), mastery: z.number() })).max(8),
  weakest: z.array(z.object({ topic: z.string(), mastery: z.number(), risk: z.number() })).max(8),
  nextLesson: z.object({ topic: z.string(), action: z.string(), reason: z.string() }).nullable(),
  village: z.array(z.object({
    name: z.string().max(60),
    topic: z.string().max(60),
    domain: z.string().max(40),
    x: z.number().int().min(1).max(8),
    y: z.number().int().min(1).max(6),
    mastery: z.number().min(0).max(1),
  })).max(48),
  questionsAnswered: z.number(),
});

export type StoryInput = z.infer<typeof inputSchema>;

/**
 * AI learning storyteller: narrates the student's journey in plain, warm language.
 * Runs on the server; the Lovable AI key never reaches the browser.
 */
export const generateStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The storyteller is not configured yet.");

    const summary = [
      `Student: ${data.name}, grade ${data.grade}. Village: "${data.villageName}".`,
      data.village.length
        ? `Actual village map (plot column, row): ${data.village.map((building) => `${building.name} at (${building.x}, ${building.y}), linked to ${building.topic} in ${building.domain} (${Math.round(building.mastery * 100)}% mastery)`).join("; ")}.`
        : "The village has no buildings yet; the student is at the very beginning of building it.",
      `XP ${data.xp}, coins ${data.coins}, badges: ${data.badges.join(", ") || "none yet"}.`,
      `Questions answered: ${data.questionsAnswered}. Overall mastery: ${Math.round(data.overallMastery * 100)}%.`,
      `Strongest topics: ${data.strongest.map((t) => `${t.topic} (${Math.round(t.mastery * 100)}%)`).join(", ") || "none yet"}.`,
      `Weakest topics: ${data.weakest.map((t) => `${t.topic} (mastery ${Math.round(t.mastery * 100)}%, struggle risk ${Math.round(t.risk * 100)}%)`).join(", ") || "none yet"}.`,
      data.nextLesson ? `Next recommended lesson: ${data.nextLesson.topic} (${data.nextLesson.action}) — ${data.nextLesson.reason}` : "No lesson recommendation yet.",
    ].join("\n");

    // A real Request is not available inside createServerFn handlers; construct one
    // so the helper can read/propagate the gateway run id and abort signal.
    const request = new Request("https://internal/story");
    const { result } = createResponsesCall(
      request,
      { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
      [{ role: "user", content: `Here is the student's learning data:\n${summary}\n\nWrite their story.` }],
      [
        "You are the storyteller of Numeria, a maths learning village game for school students.",
        "Write a warm, second-person 'village tale' of 3 short paragraphs (max 160 words total):",
        "1) describe the student's actual village by naming its real placed buildings and, when useful, their map positions; connect each building to its linked topic and current mastery, never invent buildings or claim an unbuilt structure exists,",
        "2) weave in the student's real maths progress, naming strongest and still-challenging topics and showing how learning is shaping the village,",
        "3) end with an encouraging prophecy about their next lesson and how it might help the village grow.",
        "Use gentle fantasy village imagery, never mention algorithms, models, or data. Plain text, no headings.",
      ].join(" "),
    );

    const story = (await result.text).trim();
    if (!story) throw new Error("The storyteller stayed silent — please try again.");
    return { story };
  });
