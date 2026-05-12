import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Package root (parent of `src/`) */
export const PACKAGE_ROOT = resolve(__dirname, "..");

function envPath(key: string, defaultRelativeToPackage: string): string {
	const raw = process.env[key]?.trim();
	if (raw) return isAbsolute(raw) ? resolve(raw) : resolve(PACKAGE_ROOT, raw);
	return resolve(PACKAGE_ROOT, defaultRelativeToPackage);
}

export interface ResolvedPaths {
	piBackupRoot: string;
	piTelegramExtensionRoot: string;
	piMemoryRepoRoot: string;
	piMcpAdapterRoot: string;
	memoryDir: string;
	extensionPaths: {
		piMemoryIndex: string;
		piTelegramDist: string;
		braveSearch: string;
		webFetch: string;
		piScheduler: string;
		piMcpAdapter: string;
	};
	agentsMdPath: string;
	skillsRoot: string;
}

export function resolvePaths(): ResolvedPaths {
	const piBackupRoot = envPath("PI_BACKUP_ROOT", "../pi-backup");
	const piTelegramExtensionRoot = envPath("PI_TELEGRAM_EXTENSION_ROOT", "../pi-telegram-extension");
	const piMemoryRepoRoot = envPath("PI_MEMORY_ROOT", "../pi-memory");
	const piMcpAdapterRoot = envPath("PI_MCP_ADAPTER_ROOT", "../pi-mcp-adapter");

	const memoryDirRaw = process.env.PI_MEMORY_DIR?.trim();
	const memoryDir = memoryDirRaw
		? isAbsolute(memoryDirRaw)
			? resolve(memoryDirRaw)
			: resolve(PACKAGE_ROOT, memoryDirRaw)
		: join(piBackupRoot, "memory");

	return {
		piBackupRoot,
		piTelegramExtensionRoot,
		piMemoryRepoRoot,
		piMcpAdapterRoot,
		memoryDir,
		extensionPaths: {
			piMemoryIndex: join(piMemoryRepoRoot, "index.ts"),
			piTelegramDist: join(piTelegramExtensionRoot, "dist", "index.js"),
			braveSearch: join(piBackupRoot, "extensions", "brave-search.ts"),
			webFetch: join(piBackupRoot, "extensions", "web-fetch.ts"),
			piScheduler: join(piBackupRoot, "extensions", "pi-scheduler.ts"),
			piMcpAdapter: join(piMcpAdapterRoot, "index.ts"),
		},
		agentsMdPath: join(piBackupRoot, "config", "AGENTS.md"),
		skillsRoot: join(piBackupRoot, "skills"),
	};
}

export function listSkillDirectories(skillsRoot: string): string[] {
	if (!existsSync(skillsRoot)) return [];
	const out: string[] = [];
	for (const name of readdirSync(skillsRoot)) {
		const dir = join(skillsRoot, name);
		try {
			if (!statSync(dir).isDirectory()) continue;
		} catch {
			continue;
		}
		if (existsSync(join(dir, "SKILL.md"))) out.push(dir);
	}
	return out.sort();
}

export function validatePaths(paths: ResolvedPaths): string[] {
	const errors: string[] = [];
	const check = (cond: boolean, msg: string) => {
		if (!cond) errors.push(msg);
	};

	check(existsSync(paths.piBackupRoot), `PI_BACKUP_ROOT does not exist: ${paths.piBackupRoot}`);
	check(existsSync(paths.piMemoryRepoRoot), `PI_MEMORY_ROOT does not exist: ${paths.piMemoryRepoRoot}`);
	check(existsSync(paths.extensionPaths.piMemoryIndex), `pi-memory entry missing: ${paths.extensionPaths.piMemoryIndex}`);
	check(
		existsSync(paths.extensionPaths.piTelegramDist),
		`pi-telegram-extension not built (missing ${paths.extensionPaths.piTelegramDist}). Run: cd "${paths.piTelegramExtensionRoot}" && npm install && npm run build`,
	);
	for (const [label, p] of [
		["brave-search", paths.extensionPaths.braveSearch],
		["web-fetch", paths.extensionPaths.webFetch],
		["pi-scheduler", paths.extensionPaths.piScheduler],
		["pi-mcp-adapter", paths.extensionPaths.piMcpAdapter],
	] as const) {
		check(existsSync(p), `pi-backup extension missing (${label}): ${p}`);
	}
	check(existsSync(paths.skillsRoot), `skills directory missing: ${paths.skillsRoot}`);

	return errors;
}
