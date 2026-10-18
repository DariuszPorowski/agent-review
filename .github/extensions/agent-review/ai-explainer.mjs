import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";

import { managedCopilotPath } from "./managed-copilot.mjs";
import {
    ExplanationValidationError,
    selectedModelFromEvents,
    validateExplanation,
} from "./ai-response.mjs";

export { selectedModelFromEvents, validateExplanation } from "./ai-response.mjs";

async function generateOnce({
    workingDirectory,
    prompt,
    sourceEvents = [],
    timeoutMs = 120_000,
    requiredHeadings = [],
    validateResponse = null,
    signal,
    runtimeClient = null,
    modelId,
    responseSchema,
}) {
    signal?.throwIfAborted();
    const client = runtimeClient || new CopilotClient({
        connection: RuntimeConnection.forStdio({
            path: await managedCopilotPath(),
            args: ["--server", "--stdio", "--no-auto-update"],
        }),
        workingDirectory,
        logLevel: "error",
    });
    let isolated;
    const abort = () => {
        if (isolated) void isolated.abort().catch((error) => console.error("[agent-review] Failed to abort review request:", error));
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
        if (!runtimeClient) await client.start();
        const model = modelId === undefined ? selectedModelFromEvents(sourceEvents) : modelId;
        isolated = await client.createSession({
            ...(model ? { model } : {}),
            availableTools: [],
            excludedTools: ["builtin:*", "mcp:*", "custom:*"],
            onPermissionRequest: () => ({
                kind: "reject",
                feedback: "Agent Review explanation sessions cannot use tools.",
            }),
        });
        signal?.throwIfAborted();
        const response = await isolated.sendAndWait({ prompt, ...(responseSchema ? { responseSchema } : {}) }, timeoutMs);
        signal?.throwIfAborted();
        if (response?.data?.toolRequests?.length) {
            throw new ExplanationValidationError("Copilot attempted to call a tool from an explanation-only session.");
        }
        const content = validateExplanation(response?.data?.content, requiredHeadings);
        return validateResponse ? validateResponse(content) : content;
    } finally {
        signal?.removeEventListener("abort", abort);
        try {
            if (isolated) await isolated.disconnect();
        } catch (error) {
            console.error("[agent-review] Failed to disconnect isolated Copilot session:", error);
        } finally {
            try {
                if (!runtimeClient) await client.stop();
            } catch (error) {
                console.error("[agent-review] Failed to stop isolated Copilot client:", error);
            }
        }
    }
}

export async function createExplanationRuntime(workingDirectory, modelId = null) {
    const client = new CopilotClient({
        connection: RuntimeConnection.forStdio({
            path: await managedCopilotPath(), args: ["--server", "--stdio", "--no-auto-update"],
        }),
        workingDirectory, logLevel: "error",
    });
    await client.start();
    return { client, modelId, dispose: () => client.stop() };
}

export async function generateIsolatedExplanation(options) {
    const attempts = options.attempts ?? 2;
    let lastError;
    let request = options;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await generateOnce(request);
        } catch (error) {
            lastError = error;
            if (!(error instanceof ExplanationValidationError)) throw error;
            request = { ...options, prompt: `${options.prompt}\n\nThe previous response failed validation: ${error.message}\nReturn a corrected response that satisfies the original format and evidence constraints.` };
        }
    }
    throw new Error(
        `Copilot did not return a valid explanation after ${attempts} isolated attempt${attempts === 1 ? "" : "s"}: ${lastError?.message}`,
        { cause: lastError },
    );
}
