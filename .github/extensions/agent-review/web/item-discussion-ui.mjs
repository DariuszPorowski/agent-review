const node = (tag, text, className = "") => {
    const element = document.createElement(tag);
    element.className = className;
    if (text) element.textContent = text;
    return element;
};

export class ItemDiscussionPane {
    constructor(root, { api, sourceLink, notify, latest = () => null }) {
        this.root = root;
        this.api = api;
        this.sourceLink = sourceLink;
        this.notify = notify;
        this.latest = latest;
        this.epoch = 0;
        this.drafts = new Map();
        this.messageNodes = new Map();
        this.title = node("h3", "Discussion");
        this.caption = node("p", "", "muted");
        this.messages = node("div", "", "discussion-messages");
        this.messages.setAttribute("role", "log");
        this.activity = node("p", "", "muted");
        this.activity.setAttribute("role", "status");
        this.error = node("p", "", "error hidden");
        this.form = node("form");
        this.label = node("label", "Ask about this item");
        this.input = node("textarea");
        this.input.id = "item-question";
        this.input.rows = 3;
        this.input.maxLength = 4000;
        this.input.placeholder = "Ask for the failure scenario, affected consumers, or missing evidence…";
        this.label.htmlFor = this.input.id;
        this.input.addEventListener("input", () => {
            this.input.setCustomValidity("");
            if (this.draftKey) this.drafts.set(this.draftKey, this.input.value);
        });
        this.send = node("button", "Send");
        this.send.type = "submit";
        this.stop = node("button", "Stop answer");
        this.stop.type = "button";
        this.stop.addEventListener("click", () => this.cancel().catch(this.notify));
        this.form.append(this.label, this.input, this.send, this.stop);
        this.form.addEventListener("submit", (event) => {
            event.preventDefault();
            this.submit().catch(this.notify);
        });
        root.append(this.title, this.caption, this.messages, this.activity, this.error, this.form);
    }

    async open(item, generation) {
        const epoch = ++this.epoch;
        this.item = item;
        this.draftKey = `${generation}:${item.id}`;
        this.input.value = this.drafts.get(this.draftKey) || "";
        this.title.textContent = `Discuss: ${item.title || item.name || item.id}`;
        this.activity.textContent = "Loading snapshot-pinned discussion…";
        this.error.classList.add("hidden");
        this.thread = null;
        this.send.disabled = true;
        this.stop.classList.add("hidden");
        this.messages.replaceChildren();
        this.messageNodes.clear();
        this.root.classList.remove("hidden");
        try {
            const result = await this.api(`/api/discussion?id=${encodeURIComponent(item.id)}`);
            if (epoch !== this.epoch) return;
            this.available = result.available;
            this.update(result.thread);
            if (this.latest()?.id === result.thread.id) this.update(this.latest());
            if (this.available) {
                this.input.focus({ preventScroll: true });
                this.input.scrollIntoView({ block: "nearest" });
            }
        } catch (error) {
            if (epoch !== this.epoch) return;
            this.error.textContent = error.message;
            this.error.classList.remove("hidden");
            this.activity.textContent = "Unable to open this discussion.";
            throw error;
        }
    }

    update(thread) {
        if (thread.item_id !== this.item?.id || (this.thread && thread.id !== this.thread.id)) return;
        if (this.thread && (thread.revision || 0) < (this.thread.revision || 0)) return;
        this.thread = thread;
        this.caption.textContent = `${thread.label || "Saved review"} · ${thread.commit?.slice(0, 8) || "Worktree snapshot"} · Read-only · AI interpretation, verify claims`;
        this.caption.title = `Pinned snapshot: ${thread.snapshot}`;
        const nearBottom = this.messages.scrollHeight - this.messages.scrollTop - this.messages.clientHeight < 60;
        const scroll = this.messages.scrollTop;
        const messages = [];
        for (const message of thread.messages) {
            const signature = JSON.stringify([message.status, message.content, message.limitation, message.error, message.citations, message.evidence_scope]);
            const existing = this.messageNodes.get(message.id);
            if (existing?.signature === signature) {
                messages.push(existing.node);
                continue;
            }
            const article = node("article", "", `discussion-message discussion-${message.role}`);
            article.append(node("strong", message.role === "user" ? "You" : "Copilot"));
            if (message.content) article.append(node("p", message.content));
            if (message.limitation) article.append(node("p", `Evidence limitation: ${message.limitation}`, "muted"));
            if (message.evidence_scope) article.append(node("p",
                `Source excerpts supplied: ${message.evidence_scope.supplied_files} files. Saved snapshot: ${message.evidence_scope.snapshot_files} files` +
                `${message.evidence_scope.section_files ? `; this section contains ${message.evidence_scope.section_files} files` : ""}. ` +
                "Not supplied to this answer does not mean missing from the snapshot.", "muted"));
            for (const citation of message.citations || []) article.append(this.sourceLink(citation));
            if (["stopped", "error"].includes(message.status)) article.append(node("p",
                `${message.status === "stopped" ? "Stopped" : "Could not complete"}: ${message.error || "No complete answer was produced."}`, "error"));
            messages.push(article);
            this.messageNodes.set(message.id, { node: article, signature });
        }
        if (!messages.length) messages.push(node("p", "Ask a question about this item. Answers use the saved snapshot, not later worktree edits.", "muted"));
        for (const [index, message] of messages.entries()) {
            if (this.messages.children[index] !== message) this.messages.insertBefore(message, this.messages.children[index] || null);
        }
        while (this.messages.children.length > messages.length) this.messages.lastElementChild.remove();
        this.messages.scrollTop = nearBottom ? this.messages.scrollHeight : scroll;
        const latest = thread.messages.at(-1);
        const running = latest?.status === "generating";
        this.send.disabled = !this.available || running;
        this.input.disabled = !this.available;
        this.stop.classList.toggle("hidden", !running);
        this.activity.textContent = !this.available ? "Copilot discussion is unavailable in this provider. Saved evidence is still available."
            : running ? latest.activity.at(-1)?.label || "Preparing answer…"
                : latest?.status === "complete" && latest.role === "assistant" ? "Answer complete. This thread remains pinned to its saved snapshot." : "";
        this.messages.setAttribute("aria-busy", String(running));
    }

    async submit() {
        if (!this.thread || this.send.disabled) return;
        if (!this.input.value.trim()) {
            this.input.setCustomValidity("Enter a question about this item.");
            this.input.reportValidity();
            return;
        }
        this.input.setCustomValidity("");
        this.send.disabled = true;
        this.error.classList.add("hidden");
        const item = this.item;
        const key = this.draftKey;
        const question = this.input.value;
        try {
            const response = await this.api("/api/discussion", { method: "POST",
                body: JSON.stringify({ id: item.id, question }) });
            if (this.drafts.get(key) === question) this.drafts.delete(key);
            if (this.item !== item) return;
            if (this.input.value === question) this.input.value = "";
            this.update(response.thread);
        } catch (error) {
            if (this.item !== item) {
                this.notify(new Error(`Question for ${item.title || item.id} was not sent: ${error.message}`));
                return;
            }
            this.send.disabled = false;
            this.error.textContent = error.message;
            this.error.classList.remove("hidden");
            throw error;
        }
    }

    async cancel() {
        if (!this.thread) return;
        await this.api("/api/internal-reviews/cancel", { method: "POST",
            body: JSON.stringify({ scope: `discussion:${this.thread.id}` }) });
    }

    async refresh() {
        if (!this.thread || !this.item) return;
        const epoch = this.epoch;
        const result = await this.api(`/api/discussion?id=${encodeURIComponent(this.item.id)}`);
        if (epoch !== this.epoch || result.thread.id !== this.thread.id) return;
        this.available = result.available;
        this.update(result.thread);
    }

    hide() {
        this.epoch++;
        this.root.classList.add("hidden");
    }
}
