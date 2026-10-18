export function reviewLocation(href, { snapshot, item, path, line = 1, side = "current", tab = "diff" }) {
    const location = new URL(href);
    const theme = location.searchParams.get("scoutTheme");
    location.search = "";
    if (["light", "dark"].includes(theme)) location.searchParams.set("scoutTheme", theme);
    const values = new URLSearchParams({ snapshot, path, line: String(line), side, tab });
    if (item) values.set("item", item);
    location.hash = values.toString();
    return location.href;
}

export function parseReviewLocation(hash) {
    if (!hash || hash === "#") return null;
    if (hash.length > 12_000) throw new Error("The review location exceeds its size limit.");
    const values = new URLSearchParams(hash.replace(/^#/, ""));
    if (!values.has("snapshot")) return null;
    const snapshot = values.get("snapshot"), path = values.get("path"), item = values.get("item");
    const line = Number(values.get("line") || 1), side = values.get("side") || "current", tab = values.get("tab") || "diff";
    if (!snapshot || snapshot.length > 8000 || !path || path.length > 2000 || path.startsWith("/")
        || path.includes("\\") || /^[A-Za-z][\w+.-]*:/.test(path) || path.split("/").some((part) => !part || part === "." || part === "..")
        || (item && item.length > 1000) || !Number.isSafeInteger(line) || line < 1
        || !["base", "current"].includes(side) || !["diff", "base", "current"].includes(tab)) {
        throw new Error("The review location is invalid. Use a saved snapshot and a repository-relative source range.");
    }
    return { snapshot, path, item, line, side, tab };
}
