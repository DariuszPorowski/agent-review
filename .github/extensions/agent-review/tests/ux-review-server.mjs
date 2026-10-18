import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { ReviewState } from "../review-state.mjs";
import { startReviewServer } from "../server.mjs";
import { discussionPrompt, discussionSchema } from "../item-discussion.mjs";
import { managedCopilotPath } from "../managed-copilot.mjs";

const repo = process.env.AGENT_REVIEW_UX_REPO;
if (!repo) throw new Error("Set AGENT_REVIEW_UX_REPO to a real validation repository.");
let client;
if (process.env.AGENT_REVIEW_UX_SDK) {
    const { CopilotClient, RuntimeConnection } = await import(pathToFileURL(process.env.AGENT_REVIEW_UX_SDK).href);
    client = new CopilotClient({ workingDirectory: repo, logLevel: "error",
        connection: RuntimeConnection.forStdio({ path: await managedCopilotPath(),
            args: ["--server", "--stdio", "--no-auto-update"] }) });
    await client.start();
}
const state = new ReviewState(repo, { baseRef: "HEAD", readWorktreeFingerprint: null,
    workspacePath: process.env.AGENT_REVIEW_UX_WORKSPACE,
    ...(client ? { generateDiscussion: async (context, { signal }) => {
        signal.throwIfAborted();
        const session = await client.createSession({ availableTools: [], excludedTools: ["builtin:*", "mcp:*", "custom:*"],
            onPermissionRequest: () => ({ kind: "reject", feedback: "Saved evidence only." }) });
        const abort = () => void session.abort().catch((error) => console.error("[ux discussion abort]", error));
        signal.addEventListener("abort", abort, { once: true });
        try {
            const answer = await session.sendAndWait({ prompt: discussionPrompt(context), responseSchema: discussionSchema(context) }, 120_000);
            if (answer?.data?.toolRequests?.length) throw new Error("Discussion attempted tool access.");
            return answer?.data?.content;
        } finally {
            signal.removeEventListener("abort", abort);
            await session.disconnect();
        }
    } } : {}) });
if (process.env.AGENT_REVIEW_UX_MODEL) {
    state.model = JSON.parse(await readFile(process.env.AGENT_REVIEW_UX_MODEL, "utf8"));
    const worktree = state.model.metadata.head_sha === state.model.metadata.base_sha;
    state.reviewTarget = { mode: worktree ? "worktree" : "commit", ref: state.model.metadata.head_sha,
        currentRef: worktree ? null : state.model.metadata.head_sha, baseRef: state.model.metadata.base_sha,
        label: worktree ? "Saved worktree validation" : "Large validation change" };
} else await state.refresh();
const server = await startReviewServer(state);
const info = { url: server.url, repo, pid: process.pid, discussionAvailable: Boolean(client) };
if (process.env.AGENT_REVIEW_UX_INFO) await writeFile(process.env.AGENT_REVIEW_UX_INFO, JSON.stringify(info));
console.log(JSON.stringify(info));
process.on("SIGTERM", () => void state.dispose().then(() => server.close()).then(() => client?.stop()).then(() => process.exit(0)));
