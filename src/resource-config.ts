import { readFileSync, existsSync } from "node:fs";
import type { ResolvedPaths } from "./paths.js";
import { listSkillDirectories } from "./paths.js";

/**
 * Options passed to createAgentSessionServices({ resourceLoaderOptions }).
 * Pinned extensions/skills only (no ~/.pi or project .pi discovery).
 */
export function buildResourceLoaderOptions(paths: ResolvedPaths) {
	const additionalExtensionPaths = [
		paths.extensionPaths.piMemoryIndex,
		paths.extensionPaths.piTelegramDist,
		paths.extensionPaths.braveSearch,
		paths.extensionPaths.webFetch,
		paths.extensionPaths.piScheduler,
	];

	const additionalSkillPaths = listSkillDirectories(paths.skillsRoot);

	const agentsFilesOverride = existsSync(paths.agentsMdPath)
		? (base: { agentsFiles: Array<{ path: string; content: string }> }) => {
				const content = readFileSync(paths.agentsMdPath, "utf-8");
				return {
					agentsFiles: [
						...base.agentsFiles,
						{ path: paths.agentsMdPath, content },
					],
				};
			}
		: undefined;

	return {
		noExtensions: true,
		noSkills: true,
		additionalExtensionPaths,
		additionalSkillPaths,
		...(agentsFilesOverride ? { agentsFilesOverride } : {}),
	};
}
