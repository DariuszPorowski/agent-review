import { pathEvidence } from "./decision-map.mjs";

export function reviewSignal(item) {
    if (item.verification === "supported") return { label: "AI-supported concern", kind: "ai" };
    if (item.kind === "evidence") return { label: "Saved evidence", kind: "evidence" };
    if (item.id?.startsWith("attention:") || item.related_findings || item.collect_mode) {
        return { label: "Review priority", kind: "priority" };
    }
    return { label: "Review observation", kind: "observation" };
}

export function reviewItemEvidence(model, item, decisionMap = null, run = null) {
    const subject = (model.nodes || []).find((node) => node.id === (item.node_id || item.id));
    const citations = (item.evidence_ids || []).map((id) => model.evidence?.[id])
        .filter((evidence) => evidence?.path && Number.isInteger(evidence.line) && evidence.line > 0);
    const callable = decisionMap?.callables?.find((callable) => callable.id === subject?.id);
    const counts = { confirmed: 0, failing: 0, inferred: 0, unknown: 0 };
    for (const entry of callable?.entries || []) {
        const evidence = pathEvidence(callable, entry, run);
        if (evidence?.level === "confirmed") {
            counts.confirmed++;
            if (evidence.tone === "failing") counts.failing++;
        } else if (["asserted", "exercised", "reachable", "possible"].includes(evidence?.level)) counts.inferred++;
        else counts.unknown++;
    }
    return { subject, citations, counts };
}

export function conciseReviewText(value, limit = 240) {
    const text = String(value ?? "").trim();
    if (text.length <= limit) return text;
    const end = text.lastIndexOf(" ", limit);
    return `${text.slice(0, end > limit / 2 ? end : limit)}…`;
}

export function annotationSections(markdown) {
    const preamble = [], sections = [];
    let current = null, fenced = false;
    for (const line of String(markdown).split(/\r?\n/)) {
        if (/^\s*```/.test(line)) fenced = !fenced;
        const heading = !fenced && /^##[ \t]+(.+)$/.exec(line);
        if (heading) {
            current = { title: heading[1].trim(), lines: [] };
            sections.push(current);
        }
        (current ? current.lines : preamble).push(line);
    }
    return { preamble: preamble.join("\n"), sections: sections.map(({ title, lines }) => ({ title, text: lines.join("\n") })) };
}

export function overviewBlurb(markdown) {
    const section = annotationSections(markdown).sections.find((section) => /^summary$/i.test(section.title));
    if (!section) return "";
    const lines = section.text.split(/\r?\n/).slice(1).map((line) => line.replace(/^[-*]\s+/, "").trim())
        .filter((line) => line && !/no (?:session |originating )?intent (?:was )?supplied/i.test(line));
    return conciseReviewText(lines.slice(0, 2).join(" "), 360);
}

export function reviewCommands(model) {
    const items = [];
    const nodes = new Map((model.nodes || []).map((node) => [node.id, node]));
    for (const change of model.changes || []) if (change.status !== "unchanged") {
        items.push({ id: `file:${change.path}`, kind: "file", title: change.path, path: change.path, label: "Changed file" });
    }
    for (const node of model.nodes || []) if (node.path && ["function", "method", "class", "interface"].includes(node.kind)) {
        items.push({ ...node, title: node.display_name || node.name, label: `${node.kind} · ${node.change}` });
    }
    for (const finding of model.attention || []) {
        const node = nodes.get(finding.node_id);
        items.push({ ...finding, path: node?.path, title: finding.title, label: reviewSignal(finding).label });
    }
    return items;
}
