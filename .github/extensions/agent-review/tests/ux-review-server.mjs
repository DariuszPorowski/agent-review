import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { ReviewState } from "../review-state.mjs";
import { startReviewServer } from "../server.mjs";
import { buildDiscussionVerificationPrompt, discussionPrompt, discussionSchema } from "../item-discussion.mjs";
import { managedCopilotPath } from "../managed-copilot.mjs";
import { generateIsolatedExplanation } from "../ai-explainer.mjs";
import { ANNOTATION_HEADINGS, OVERVIEW_HEADINGS, buildAnnotationPrompt, buildAnnotationVerificationPrompt, buildOverviewPrompt } from "../ai-prompts.mjs";
import { resolveReviewTarget } from "../review-target.mjs";

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
    getHistoricalSessionContexts: async () => ({ contexts: [], failures: [] }),
    ...(client ? {
        generateDiscussion: (context, { signal }) => generateIsolatedExplanation({
            workingDirectory: repo, runtimeClient: client, signal, attempts: 1,
            prompt: discussionPrompt(context), responseSchema: discussionSchema(context),
            verifyPrompt: (content) => buildDiscussionVerificationPrompt(context, content),
        }),
        generateAnnotation: (context) => generateIsolatedExplanation({
            workingDirectory: repo, runtimeClient: client,
            prompt: context.kind === "overview" ? buildOverviewPrompt(context) : buildAnnotationPrompt(context),
            requiredHeadings: context.kind === "overview" ? OVERVIEW_HEADINGS : ANNOTATION_HEADINGS,
            ...(context.kind !== "overview" ? { verifyPrompt: (draft) => buildAnnotationVerificationPrompt(context, draft) } : {}),
        }),
    } : {}) });
if (process.env.AGENT_REVIEW_UX_MODEL) {
    state.model = JSON.parse(await readFile(process.env.AGENT_REVIEW_UX_MODEL, "utf8"));
    const worktree = state.model.metadata.head_sha === state.model.metadata.base_sha;
    state.reviewTarget = { ...await resolveReviewTarget(repo, { mode: worktree ? "worktree" : "commit", ref: state.model.metadata.head_sha }),
        baseRef: state.model.metadata.base_sha };
} else await state.refresh();
const server = await startReviewServer(state);
const info = { url: server.url, repo, pid: process.pid, discussionAvailable: Boolean(client) };
if (process.env.AGENT_REVIEW_UX_INFO) await writeFile(process.env.AGENT_REVIEW_UX_INFO, JSON.stringify(info));
console.log(JSON.stringify(info));
process.on("SIGTERM", () => void state.dispose().then(() => server.close()).then(() => client?.stop()).then(() => process.exit(0)));
