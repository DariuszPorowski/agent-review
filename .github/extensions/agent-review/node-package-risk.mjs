import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
let configuredRegistryPromise;

async function lookup(fetchImpl, url, init, timeoutMs) {
    const signal = AbortSignal.timeout(timeoutMs);
    const response = await fetchImpl(url, { ...init, signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    return response.json();
}

function errorMessage(error) {
    return [...new Set([
        error?.message,
        error?.cause?.code,
        error?.cause?.reason,
        error?.cause?.message,
    ].filter(Boolean))].join(" · ");
}

function safeRegistryUrl(value) {
    try {
        const url = new URL(String(value || "").trim());
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
        return `${url.href.replace(/\/+$/, "")}/`;
    } catch {
        return null;
    }
}

async function npmRegistry(options) {
    if (options.registryUrl) return safeRegistryUrl(options.registryUrl) || "https://registry.npmjs.org/";
    if (options.fetchImpl) return "https://registry.npmjs.org/";
    const environment = safeRegistryUrl(process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY);
    if (environment) return environment;
    const executable = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
    const args = process.platform === "win32"
        ? ["/d", "/s", "/c", "npm config get registry"]
        : ["config", "get", "registry"];
    configuredRegistryPromise ||= execFileAsync(executable, args, {
        encoding: "utf8",
        windowsHide: true,
        timeout: 5_000,
    }).then(({ stdout }) => safeRegistryUrl(stdout) || "https://registry.npmjs.org/")
        .catch(() => "https://registry.npmjs.org/");
    return configuredRegistryPromise;
}

function repositoryUrl(value) {
    const raw = typeof value === "string" ? value : value?.url;
    if (!raw) return null;
    if (/^[\w.-]+\/[\w.-]+$/.test(raw)) return `https://github.com/${raw}`;
    return raw.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/\.git$/, "");
}

export async function assessNpmPackageRisk(name, version, options = {}) {
    if (typeof name !== "string" || !/^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i.test(name)) throw new TypeError("Invalid npm package name.");
    if (version !== null && (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version))) {
        throw new TypeError("npm assessment requires an exact version or null.");
    }
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const timeout = options.timeoutMs || 5000;
    const registry = await npmRegistry(options);
    const now = new Date(options.now || Date.now());
    const sources = {
        npm: { status: "pending", error: null },
        osv: { status: version ? "pending" : "skipped", error: version ? null : "Exact reviewed version unknown; version-specific vulnerabilities cannot be assessed." },
    };
    const indicators = {
        known_vulnerabilities: [], vulnerability_count: null, latest_version: null,
        repository_url: null, maintenance: { status: "unknown" }, provenance: null,
    };
    const evidence = [];
    await Promise.all([
        (async () => {
            try {
                const data = await lookup(fetchImpl, `${registry}${encodeURIComponent(name)}`, {}, timeout);
                if (!data || typeof data["dist-tags"]?.latest !== "string") throw new Error("Invalid npm registry metadata response.");
                const release = version ? data.versions?.[version] : null;
                if (version && !release) throw new Error(`npm registry metadata does not contain the reviewed version ${version}.`);
                indicators.latest_version = data["dist-tags"]?.latest || null;
                const releases = Object.entries(data.time || {})
                    .filter(([key, value]) => /^\d+\.\d+\.\d+/.test(key) && Number.isFinite(Date.parse(value)))
                    .map(([key, value]) => ({ version: key, date: new Date(value) }));
                const latestDate = data.time?.[indicators.latest_version]
                    ? new Date(data.time[indicators.latest_version]) : null;
                const releaseDate = version && data.time?.[version] ? new Date(data.time[version]) : null;
                const days = (date) => date && Number.isFinite(date.getTime())
                    ? Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000)) : null;
                const latestAge = days(latestDate);
                indicators.release_age_days = days(releaseDate);
                indicators.maintenance = latestAge === null
                    ? { status: "unknown", latest_release_date: null, days_since_latest_release: null, releases_last_12_months: 0 }
                    : {
                        status: latestAge <= 365 ? "active" : latestAge <= 730 ? "stale" : "dormant",
                        latest_release_date: latestDate.toISOString(),
                        days_since_latest_release: latestAge,
                        releases_last_12_months: releases.filter((item) =>
                            item.date <= now && now.getTime() - item.date.getTime() <= 365 * 86_400_000).length,
                    };
                indicators.repository_url = repositoryUrl(release?.repository || data.repository);
                indicators.provenance = {
                    summary: release?.description || data.description || null,
                    license: release?.license || null,
                    registry_url: `https://www.npmjs.com/package/${name}`,
                    homepage: release?.homepage || data.homepage || null,
                    first_release_date: releases.length
                        ? new Date(Math.min(...releases.map((item) => item.date.getTime()))).toISOString() : null,
                    release_count: releases.length,
                };
                indicators.deprecated = release?.deprecated || null;
                sources.npm = { status: "ok", error: null };
                evidence.push({ id: "npm.metadata", source: "npm", value: { latest_version: indicators.latest_version, deprecated: indicators.deprecated } });
            } catch (error) {
                sources.npm = { status: "error", error: errorMessage(error) };
            }
        })(),
        (async () => {
            if (!version) return;
            try {
                const data = await lookup(fetchImpl, "https://api.osv.dev/v1/query", {
                    method: "POST", headers: { "content-type": "application/json" },
                    body: JSON.stringify({ package: { ecosystem: "npm", name }, version }),
                }, timeout);
                if (!data || (data.vulns !== undefined && !Array.isArray(data.vulns))) throw new Error("Invalid OSV response.");
                indicators.known_vulnerabilities = (data.vulns || []).map((vuln) => ({
                    id: vuln.id, summary: vuln.summary || null, aliases: vuln.aliases || [],
                    url: `https://osv.dev/vulnerability/${encodeURIComponent(vuln.id)}`,
                }));
                indicators.vulnerability_count = indicators.known_vulnerabilities.length;
                sources.osv = { status: "ok", error: null };
                evidence.push({ id: "osv.vulnerabilities", source: "osv", value: indicators.known_vulnerabilities });
            } catch (error) {
                sources.osv = { status: "error", error: errorMessage(error) };
            }
        })(),
    ]);
    const known = indicators.vulnerability_count;
    return {
        name, version, ecosystem: "npm", fetched_at: new Date().toISOString(), sources, indicators, evidence,
        risk: {
            level: known > 0 ? "high" : "unknown", score: null,
            reasons: known > 0 ? [`${known} OSV advisories affect the reviewed version.`]
                : [known === 0 ? "No matching OSV advisory was returned; broader package risk is not assessed." : "Version-specific vulnerability status is unknown."],
        },
        alternatives: [], alternatives_note: "Alternatives require separate review.",
    };
}
