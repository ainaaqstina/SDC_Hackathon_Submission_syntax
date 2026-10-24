export class RunpodInferenceError extends Error {
  constructor(
    message: string,
    readonly statusCode = 503,
    readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = "RunpodInferenceError";
  }
}

type RunpodChatInput = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
};

const RUNPOD_TIMEOUT_MS = 120_000;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const getChatCompletionsUrl = (baseUrl: string): string => {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new RunpodInferenceError("RunPod is not configured with a valid base URL.", 503);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new RunpodInferenceError("RunPod base URL must use HTTP or HTTPS.", 503);
  }
  if (url.username || url.password) {
    throw new RunpodInferenceError("Do not put credentials in RUNPOD_BASE_URL.", 503);
  }
  if (
    url.protocol === "http:" &&
    (url.hostname.endsWith(".proxy.runpod.net") || url.hostname === "api.runpod.ai")
  ) {
    // Public RunPod proxies redirect HTTP to HTTPS. Normalize before POSTing so
    // a redirect cannot change the method or drop the Authorization header.
    url.protocol = "https:";
  }
  if (
    url.protocol === "http:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new RunpodInferenceError(
      "Use an HTTPS RunPod base URL. Plain HTTP is only allowed for local development.",
      503,
    );
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/chat/completions")) {
    url.pathname = `${path}/chat/completions`;
  }
  return url.toString();
};

export const parseJsonContent = (content: string): unknown => {
  let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const finalThinkTag = cleaned.lastIndexOf("</think>");
  if (finalThinkTag >= 0) {
    cleaned = cleaned.slice(finalThinkTag + "</think>".length).trim();
  }
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new RunpodInferenceError("RunPod returned a response that was not valid JSON.", 502);
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  } catch {
    throw new RunpodInferenceError("RunPod returned a response that was not valid JSON.", 502);
  }
};

export const runpodJsonCompletion = async ({
  systemPrompt,
  userPrompt,
  maxTokens = 4096,
}: RunpodChatInput): Promise<unknown> => {
  const baseUrl = process.env.RUNPOD_BASE_URL?.trim();
  const apiKey = process.env.RUNPOD_API_KEY?.trim();
  const model = process.env.RUNPOD_MODEL_NAME?.trim();

  if (!baseUrl || !apiKey || !model) {
    throw new RunpodInferenceError(
      "RunPod is not configured. Set RUNPOD_BASE_URL, RUNPOD_API_KEY, and RUNPOD_MODEL_NAME.",
      503,
    );
  }

  const endpoint = getChatCompletionsUrl(baseUrl);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        stream: false,
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(RUNPOD_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new RunpodInferenceError("RunPod inference timed out. Please try again.", 504);
    }
    throw new RunpodInferenceError("Could not reach RunPod. Please try again shortly.", 503);
  }

  if (!response.ok) {
    const message =
      response.status >= 300 && response.status < 400
        ? "RunPod redirected the request. Use the final HTTPS OpenAI-compatible base URL."
        : response.status === 401 || response.status === 403
          ? "RunPod authentication was rejected. Check RUNPOD_API_KEY and the model server's authentication settings."
          : response.status === 404 || response.status === 405
            ? "RunPod's chat completion route was not found. Check RUNPOD_BASE_URL."
            : response.status === 429
              ? "RunPod is busy. Please try again shortly."
              : response.status >= 500
                ? "RunPod inference is temporarily unavailable."
                : "RunPod rejected the request. Check the endpoint and model configuration.";
    throw new RunpodInferenceError(
      message,
      response.status === 429 || response.status >= 500 ? 503 : 502,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new RunpodInferenceError("RunPod returned an unreadable response.", 502);
  }

  const choices = asRecord(payload)?.choices;
  const firstChoice = Array.isArray(choices) ? asRecord(choices[0]) : undefined;
  const message = asRecord(firstChoice?.message);
  const content = message?.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((part) => asRecord(part)?.text)
            .filter((part): part is string => typeof part === "string")
            .join("\n")
        : "";

  if (!text.trim()) {
    throw new RunpodInferenceError("RunPod returned an empty response.", 502);
  }
  return parseJsonContent(text);
};
