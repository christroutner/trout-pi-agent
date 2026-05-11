import "dotenv/config";
import { mkdirSync } from "node:fs";
import {
	type AgentSessionRuntimeDiagnostic,
	AuthStorage,
	createAgentSessionFromServices,
	createAgentSessionRuntime,
	type CreateAgentSessionRuntimeFactory,
	createAgentSessionServices,
	getAgentDir,
	initTheme,
	InteractiveMode,
	SessionManager,
} from "@earendil-works/pi-coding-agent";
import { resolvePaths, validatePaths } from "./paths.js";
import { buildResourceLoaderOptions } from "./resource-config.js";

function collectSettingsDiagnostics(
	context: string,
	errors: ReadonlyArray<{ scope: string; error: Error }>,
): AgentSessionRuntimeDiagnostic[] {
	return errors.map(({ scope, error }) => ({
		type: "warning" as const,
		message: `(${context}, ${scope} settings) ${error.message}`,
	}));
}

function reportDiagnostics(diagnostics: readonly AgentSessionRuntimeDiagnostic[]): void {
	for (const diagnostic of diagnostics) {
		const prefix =
			diagnostic.type === "error" ? "Error: " : diagnostic.type === "warning" ? "Warning: " : "";
		console.error(`${prefix}${diagnostic.message}`);
	}
}

async function main(): Promise<void> {
	const paths = resolvePaths();

	process.env.PI_MEMORY_DIR = paths.memoryDir;
	try {
		mkdirSync(paths.memoryDir, { recursive: true });
	} catch {
		// ignore
	}

	const pathErrors = validatePaths(paths);
	if (pathErrors.length > 0) {
		for (const e of pathErrors) console.error(e);
		process.exit(1);
	}

	console.log("trout-pi-agent paths:");
	console.log(`  PI_BACKUP_ROOT (cwd)=${paths.piBackupRoot}`);
	console.log(`  PI_MEMORY_DIR=${paths.memoryDir}`);
	console.log(`  Extensions: ${paths.extensionPaths.piMemoryIndex} → … → ${paths.extensionPaths.piScheduler}`);

	if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
		console.warn("Warning: TELEGRAM_BOT_TOKEN is unset — pi-telegram-extension will fail until it is set.");
	}

	const agentDir = getAgentDir();
	const authStorage = AuthStorage.create();
	const resourceLoaderOptions = buildResourceLoaderOptions(paths);

	const createRuntime: CreateAgentSessionRuntimeFactory = async ({
		cwd,
		agentDir: ad,
		sessionManager,
		sessionStartEvent,
	}) => {
		const services = await createAgentSessionServices({
			cwd,
			agentDir: ad,
			authStorage,
			resourceLoaderOptions,
		});
		const { settingsManager, modelRegistry, resourceLoader } = services;

		const settingsErrors = settingsManager.drainErrors();
		const diagnostics: AgentSessionRuntimeDiagnostic[] = [
			...services.diagnostics,
			...collectSettingsDiagnostics("runtime creation", settingsErrors),
			...resourceLoader.getExtensions().errors.map(({ path, error }) => ({
				type: "error" as const,
				message: `Failed to load extension "${path}": ${error}`,
			})),
		];

		const created = await createAgentSessionFromServices({
			services,
			sessionManager,
			sessionStartEvent,
		});

		return {
			...created,
			services,
			diagnostics,
		};
	};

	const sessionManager = SessionManager.create(paths.piBackupRoot);
	const runtime = await createAgentSessionRuntime(createRuntime, {
		cwd: paths.piBackupRoot,
		agentDir,
		sessionManager,
	});

	reportDiagnostics(runtime.diagnostics);
	if (runtime.diagnostics.some((d) => d.type === "error")) {
		process.exit(1);
	}

	const { session, modelFallbackMessage, services } = runtime;
	const { settingsManager } = services;

	if (!session.model) {
		console.error("No model available. Configure auth and default model in Pi settings (~/.pi/agent).");
		process.exit(1);
	}

	initTheme(settingsManager.getTheme(), true);

	const interactiveMode = new InteractiveMode(runtime, {
		migratedProviders: [],
		modelFallbackMessage,
		initialMessages: [],
	});

	await interactiveMode.run();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
