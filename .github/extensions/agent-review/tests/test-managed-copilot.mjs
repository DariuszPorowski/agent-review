import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, chmod, mkdir, mkdtemp, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { managedCopilotPath } from "../managed-copilot.mjs";

async function fixture(t) {
    const home = await mkdtemp(join(tmpdir(), "agent-review-cli-test-"));
    t.after(() => rm(home, { recursive: true, force: true }));
    const windows = process.platform === "win32";
    const root = windows ? join(home, "github-copilot-sdk", "cli")
        : join(home, "Library", "Caches", "github-copilot-sdk", "cli");
    const executable = windows ? "copilot.exe" : "copilot";
    const options = {
        platform: windows ? "win32" : "darwin",
        execPath: join(home, windows ? "node.exe" : "node"),
        home,
        env: windows ? { LOCALAPPDATA: home } : {},
    };
    const install = async (version, mode = 0o755) => {
        const path = join(root, version, executable);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, "test executable", { mode });
        return path;
    };
    return { home, root, executable, options, install };
}

test("uses native managed-cache paths, including spaces, without looking on PATH", async (t) => {
    const { options, install } = await fixture(t);
    const cli = await install("1.0.94-3 with spaces");
    options.env.PATH = "/unrelated/copilot";
    assert.equal(await managedCopilotPath(options), cli);
});

for (const [platform, execPath] of [
    ["darwin", "/Applications/GitHub App/copilot"],
    ["linux", "/managed/copilot"],
    ["win32", "C:\\Managed App\\COPILOT.EXE"],
]) {
    test(`prefers the running Copilot on ${platform} without scanning the cache`, async () => {
        const seen = [];
        const fs = {
            stat: async (path) => { seen.push(path); return { isFile: () => true }; },
            access: async (path, mode) => {
                assert.equal(path, execPath);
                assert.equal(mode, platform === "win32" ? constants.F_OK : constants.X_OK);
            },
            readdir: async () => { throw new Error("Must not scan when already running Copilot"); },
        };
        assert.equal(await managedCopilotPath({ platform, execPath, fs, env: {} }), execPath);
        assert.deepEqual(seen, [execPath]);
    });
}

test("macOS without LOCALAPPDATA scans the home cache, never a relative Windows folder", async () => {
    const home = "/Users/Example User";
    const root = `${home}/Library/Caches/github-copilot-sdk/cli`;
    const candidate = `${root}/1.0.94-3/copilot`;
    const fs = {
        readdir: async (path, options) => {
            assert.equal(path, root);
            assert.deepEqual(options, { withFileTypes: true });
            return [{ name: "1.0.94-3", isDirectory: () => true }];
        },
        stat: async (path) => {
            assert.equal(path, candidate);
            return { isFile: () => true };
        },
        access: async (path, mode) => {
            assert.equal(path, candidate);
            assert.equal(mode, constants.X_OK);
        },
    };
    assert.equal(await managedCopilotPath({
        platform: "darwin", execPath: "/usr/local/bin/node", home, env: {}, fs,
    }), candidate);
});

test("Windows uses LOCALAPPDATA and copilot.exe even when tested on another OS", async () => {
    const root = "C:\\Users\\Example User\\AppData\\Local\\github-copilot-sdk\\cli";
    const candidate = `${root}\\1.0.94-3\\copilot.exe`;
    const fs = {
        readdir: async (path) => {
            assert.equal(path, root);
            return [{ name: "1.0.94-3", isDirectory: () => true }];
        },
        stat: async (path) => {
            assert.equal(path, candidate);
            return { isFile: () => true };
        },
        access: async (path, mode) => {
            assert.equal(path, candidate);
            assert.equal(mode, constants.F_OK);
        },
    };
    assert.equal(await managedCopilotPath({
        platform: "win32", execPath: "C:\\Node\\node.exe",
        env: { LOCALAPPDATA: "C:\\Users\\Example User\\AppData\\Local" }, fs,
    }), candidate);
});

test("selects versions numerically and skips incomplete installations and non-directories", async (t) => {
    const { root, executable, options, install } = await fixture(t);
    await install("1.0.9");
    const cli = await install("1.0.10");
    await mkdir(join(root, "1.0.12"), { recursive: true });
    await mkdir(join(root, "1.0.11", executable), { recursive: true });
    await writeFile(join(root, "1.0.13"), "not a version directory");
    assert.equal(await managedCopilotPath(options), cli);
});

test("falls back to the cache when the running Copilot was removed", async (t) => {
    const { home, executable, options, install } = await fixture(t);
    const cli = await install("1.0.94-3");
    assert.equal(await managedCopilotPath({ ...options, execPath: join(home, executable) }), cli);
});

test("follows valid executable symlinks", { skip: process.platform === "win32" }, async (t) => {
    const { root, executable, options, install } = await fixture(t);
    const target = await install("1.0.9");
    const link = join(root, "1.0.10", executable);
    await mkdir(dirname(link), { recursive: true });
    await symlink(target, link);
    assert.equal(await managedCopilotPath(options), link);
});

test("skips non-executable files but explains permissions if no usable version remains",
    { skip: process.platform === "win32" }, async (t) => {
        const { options, install } = await fixture(t);
        const latest = await install("1.0.10", 0o644);
        await assert.rejects(managedCopilotPath(options), (error) => {
            assert.match(error.message, /Access denied or not executable/);
            assert.ok(error.message.includes(latest));
            assert.equal(error.cause.code, "EACCES");
            return true;
        });
        const older = await install("1.0.9");
        assert.equal(await managedCopilotPath(options), older);
        await chmod(latest, 0o755);
        assert.equal(await managedCopilotPath(options), latest);
    });

for (const state of ["missing", "empty", "not a directory", "missing executable"]) {
    test(`${state} cache gives recovery guidance instead of raw ENOENT`, async (t) => {
        const { root, options } = await fixture(t);
        if (state === "empty") await mkdir(root, { recursive: true });
        if (state === "not a directory") {
            await mkdir(dirname(root), { recursive: true });
            await writeFile(root, "not a directory");
        }
        if (state === "missing executable") await mkdir(join(root, "1.0.94-3"), { recursive: true });
        await assert.rejects(managedCopilotPath(options), (error) => {
            assert.match(error.message, /Unable to locate a usable app-managed Copilot CLI/);
            assert.match(error.message, /Update or restart the GitHub app/);
            assert.ok(error.message.includes(root));
            assert.doesNotMatch(error.message, /ENOENT|ENOTDIR|scandir/);
            return true;
        });
    });
}

test("missing or relative Windows cache settings never cause filesystem or PATH searches", async () => {
    const unexpected = async () => { throw new Error("Unexpected filesystem lookup"); };
    for (const LOCALAPPDATA of [undefined, "", "relative", "C:relative"]) {
        await assert.rejects(managedCopilotPath({
            platform: "win32", execPath: "C:\\node.exe", env: { LOCALAPPDATA, PATH: "C:\\other" },
            fs: { readdir: unexpected, stat: unexpected, access: unexpected },
        }), /LOCALAPPDATA is missing or is not an absolute path/);
    }
});

test("invalid macOS home never produces a relative cache search", async () => {
    const unexpected = async () => { throw new Error("Unexpected filesystem lookup"); };
    for (const home of ["", "relative"]) {
        await assert.rejects(managedCopilotPath({
            platform: "darwin", execPath: "/usr/bin/node", home, env: {},
            fs: { readdir: unexpected, stat: unexpected, access: unexpected },
        }), /macOS home directory is missing or is not an absolute path/);
    }
});

test("does not guess a cache or use PATH on platforms without a configured managed location", async () => {
    const unexpected = async () => { throw new Error("Unexpected filesystem lookup"); };
    await assert.rejects(managedCopilotPath({
        platform: "linux", execPath: "/usr/bin/node", env: { PATH: "/bin" },
        fs: { readdir: unexpected, stat: unexpected, access: unexpected },
    }), /No managed cache location is configured.*run the extension from Copilot/);
});

for (const operation of ["readdir", "stat", "access"]) {
    for (const code of ["EACCES", "EIO"]) {
        test(`${operation} ${code} errors retain their cause and diagnostic context`, async (t) => {
            const { options, install, root } = await fixture(t);
            await install("1.0.94-3");
            const cause = Object.assign(new Error(`${code}: test failure`), { code });
            const fs = { access, readdir, stat, [operation]: async () => { throw cause; } };
            await assert.rejects(managedCopilotPath({ ...options, fs }), (error) => {
                assert.equal(error.cause, cause);
                assert.ok(error.message.includes(root));
                assert.match(error.message, /Could not read|Could not inspect|Access denied/);
                assert.match(error.message, /GitHub app/);
                return true;
            });
        });
    }
}

test("historical lookup and AI explanations report discovery errors before starting an SDK client", async () => {
    const dataModule = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
    const resolver = new URL("../managed-copilot.mjs", import.meta.url).href;
    const missingInstallation = dataModule(`
        import { managedCopilotPath } from ${JSON.stringify(resolver)};
        export const managedCopilotPathForTest = () => managedCopilotPath({
            platform: "win32", execPath: "C:\\\\node.exe", env: {},
        });
        export { managedCopilotPathForTest as managedCopilotPath };
    `);
    const sdk = dataModule(`
        export class CopilotClient {
            constructor() { throw new Error("Must discover the CLI before creating a client"); }
        }
        export const RuntimeConnection = {
            forStdio() { throw new Error("Must discover the CLI before creating a connection"); },
        };
    `);
    const loader = dataModule(`
        export async function resolve(specifier, context, nextResolve) {
            if (specifier === "@github/copilot-sdk") {
                return { url: ${JSON.stringify(sdk)}, shortCircuit: true };
            }
            if (specifier === "./managed-copilot.mjs") {
                return { url: ${JSON.stringify(missingInstallation)}, shortCircuit: true };
            }
            return nextResolve(specifier, context);
        }
    `);
    const historical = new URL("../historical-sessions.mjs", import.meta.url).href;
    const explainer = new URL("../ai-explainer.mjs", import.meta.url).href;
    const source = `
        import assert from "node:assert/strict";
        import { loadHistoricalSessionContexts } from ${JSON.stringify(historical)};
        import { generateIsolatedExplanation } from ${JSON.stringify(explainer)};
        const expected = /Unable to locate a usable app-managed Copilot CLI.*LOCALAPPDATA.*Update or restart the GitHub app/;
        await assert.rejects(loadHistoricalSessionContexts(process.cwd(), "test"), expected);
        await assert.rejects(generateIsolatedExplanation({ workingDirectory: process.cwd(), prompt: "test" }), expected);
    `;
    await promisify(execFile)(process.execPath, ["--loader", loader, "--input-type=module", "-e", source], {
        timeout: 15000,
        windowsHide: true,
    });
});
