import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";

export async function managedCopilotPath({
    platform = process.platform,
    execPath = process.execPath,
    env = process.env,
    home = homedir(),
    fs = { access, readdir, stat },
} = {}) {
    const paths = platform === "win32" ? win32 : posix;
    const platformName = { darwin: "macOS", win32: "Windows", linux: "Linux" }[platform] || platform;
    const executable = platform === "win32" ? "copilot.exe" : "copilot";
    const searched = [];
    const denied = [];
    const recovery = "Update or restart the GitHub app to restore its managed Copilot CLI, then retry.";
    const failure = (detail, cause) => new Error(
        `Unable to locate a usable app-managed Copilot CLI on ${platformName}. ${detail} ${recovery}`,
        cause ? { cause } : undefined,
    );
    const runnable = async (candidate) => {
        searched.push(candidate);
        try {
            if (!(await fs.stat(candidate)).isFile()) return false;
            await fs.access(candidate, platform === "win32" ? constants.F_OK : constants.X_OK);
            return true;
        } catch (error) {
            if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
            if (error.code === "EACCES" || error.code === "EPERM") {
                denied.push({ path: candidate, error });
                return false;
            }
            throw failure(`Could not inspect ${candidate}: ${error.message}`, error);
        }
    };

    const runningName = paths.basename(execPath);
    if (paths.isAbsolute(execPath)
        && (platform === "win32" ? runningName.toLowerCase() : runningName) === executable
        && await runnable(execPath)) {
        return execPath;
    }

    let root;
    let unavailable;
    if (platform === "win32") {
        if (env.LOCALAPPDATA && paths.isAbsolute(env.LOCALAPPDATA)) {
            root = paths.join(env.LOCALAPPDATA, "github-copilot-sdk", "cli");
        } else {
            unavailable = "LOCALAPPDATA is missing or is not an absolute path.";
        }
    } else if (platform === "darwin") {
        if (home && paths.isAbsolute(home)) {
            root = paths.join(home, "Library", "Caches", "github-copilot-sdk", "cli");
        } else {
            unavailable = "The macOS home directory is missing or is not an absolute path.";
        }
    } else {
        unavailable = "No managed cache location is configured for this platform; run the extension from Copilot.";
    }

    if (root) {
        searched.push(root);
        let versions;
        try {
            versions = await fs.readdir(root, { withFileTypes: true });
        } catch (error) {
            if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
                throw failure(`Could not read ${root}: ${error.message} Check access to this folder.`, error);
            }
            versions = [];
        }
        const candidates = versions.filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        for (const version of candidates) {
            const candidate = paths.join(root, version, executable);
            if (await runnable(candidate)) return candidate;
        }
    }

    const details = [
        unavailable,
        searched.length ? `Searched: ${searched.join(", ")}.` : `The running executable is not ${executable}.`,
        denied.length ? `Access denied or not executable: ${denied.map((item) => item.path).join(", ")}. Check file permissions.` : null,
    ].filter(Boolean).join(" ");
    throw failure(details, denied[0]?.error);
}
