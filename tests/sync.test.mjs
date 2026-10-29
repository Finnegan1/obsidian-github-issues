import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

class TFile {
	constructor(path, content) {
		this.path = path;
		this.name = path.split("/").at(-1);
		this.extension = "md";
		this.content = content;
	}
}
class TFolder {
	constructor(path) {
		this.path = path;
		this.children = [];
	}
}
class Plugin {
	constructor(app) {
		this.app = app;
	}
	async loadData() {
		return structuredClone(this.app.data);
	}
	async saveData(data) {
		this.app.data = structuredClone(data);
	}
	addRibbonIcon() {
		return { addClass() {} };
	}
	addStatusBarItem() {
		return { setText() {} };
	}
	addCommand() {}
	registerView() {}
	addSettingTab() {}
}
class PluginSettingTab {
	constructor(app) {
		this.app = app;
	}
}
const obsidian = {
	Plugin,
	PluginSettingTab,
	TFile,
	TFolder,
	Notice: class {},
	ItemView: class {},
	Modal: class {},
	AbstractInputSuggest: class {},
};
const { outputFiles } = await build({
	stdin: {
		contents:
			'export { default as IssueTrackerPlugin } from "./src/main"; export { DEFAULT_SETTINGS, DEFAULT_REPOSITORY_TRACKING } from "./src/types";',
		resolveDir: process.cwd(),
	},
	bundle: true,
	platform: "node",
	format: "cjs",
	external: ["obsidian"],
	write: false,
});
const bundled = { exports: {} };
const require = createRequire(import.meta.url);
new Function("require", "module", "exports", outputFiles[0].text)(
	(id) => (id === "obsidian" ? obsidian : require(id)),
	bundled,
	bundled.exports,
);
const { IssueTrackerPlugin, DEFAULT_SETTINGS, DEFAULT_REPOSITORY_TRACKING } =
	bundled.exports;

function createApp() {
	const entries = new Map();
	function add(entry) {
		assert.equal(entries.has(entry.path), false);
		entries.set(entry.path, entry);
		const parent = entries.get(
			entry.path.slice(0, entry.path.lastIndexOf("/")),
		);
		if (parent instanceof TFolder) parent.children.push(entry);
		return entry;
	}
	return {
		data: structuredClone(DEFAULT_SETTINGS),
		vault: {
			getAbstractFileByPath: (path) => entries.get(path) ?? null,
			getFiles: () =>
				[...entries.values()].filter((f) => f instanceof TFile),
			createFolder: async (path) => add(new TFolder(path)),
			create: async (path, content) => add(new TFile(path, content)),
			read: async (file) => file.content,
			modify: async (file, content) => {
				file.content = content;
			},
		},
	};
}

function issue(number, login) {
	return {
		number,
		title: `Assigned issue ${number}`,
		body: `Details for issue ${number}`,
		state: "open",
		html_url: `https://github.example.com/owner/repo/issues/${number}`,
		user: { login },
		assignees: [{ login }],
		labels: [],
		created_at: "2026-01-01T12:00:00Z",
		updated_at: "2026-01-02T12:00:00Z",
	};
}

function interceptGitHub(t) {
	t.mock.method(globalThis, "fetch", async (url) => {
		const path = new URL(url).pathname;
		let data;
		if (path === "/api/v3/user") data = { login: "enterprise-user" };
		else if (path === "/api/v3/repos/owner/repo/issues") {
			data = [issue(1, "enterprise-user"), issue(2, "another-user")];
		} else throw new Error(`Unexpected request: ${url}`);
		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	});
}

function configure(app) {
	app.data.providers = [
		{
			id: "github",
			type: "github",
			enabled: true,
			token: "test-token",
			baseUrl: "https://github.example.com",
		},
	];
	app.data.repositories = [
		{ ...DEFAULT_REPOSITORY_TRACKING, repository: "owner/repo" },
	];
	app.data.syncOnStartup = false;
	app.data.profiles[0].includeIssueComments = false;
	app.data.profiles[0].enableAssigneeFilter = true;
	app.data.profiles[0].assigneeFilterModes = ["assigned-to-me"];
}

test("Saving settings does not hide issues assigned to the authenticated Enterprise user", async (t) => {
	interceptGitHub(t);
	const app = createApp();
	configure(app);
	const plugin = new IssueTrackerPlugin(app);
	await plugin.onload();
	t.after(() => plugin.onunload());
	await plugin.saveSettings();
	await plugin.syncSingleRepository("owner/repo");

	const file = app.vault.getAbstractFileByPath(
		"GitHub/owner/repo/Issue - 1.md",
	);
	assert.ok(
		file instanceof TFile,
		"The assigned issue must be written to the vault",
	);
	assert.ok((await app.vault.read(file)).includes("Details for issue 1"));
	assert.equal(
		app.vault.getAbstractFileByPath("GitHub/owner/repo/Issue - 2.md"),
		null,
	);
});

test("Full sync uses each instance's authenticated user after settings change", async (t) => {
	t.mock.method(globalThis, "fetch", async (url) => {
		const { hostname, pathname } = new URL(url);
		const primary = hostname === "github.example.com";
		let data;
		if (pathname === "/api/v3/user") {
			data = { login: primary ? "enterprise-user" : "secondary-user" };
		} else if (primary && pathname === "/api/v3/repos/owner/repo/issues") {
			data = [issue(1, "enterprise-user"), issue(2, "secondary-user")];
		} else if (
			!primary &&
			pathname === "/api/v3/repos/secondary/repo/issues"
		) {
			data = [issue(3, "secondary-user"), issue(4, "enterprise-user")];
		} else throw new Error(`Unexpected request: ${url}`);
		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	});
	const app = createApp();
	configure(app);
	app.data.providers.push({
		id: "github-2",
		type: "github",
		enabled: true,
		token: "second-test-token",
		baseUrl: "https://github.other.example.com",
	});
	app.data.repositories.push({
		...DEFAULT_REPOSITORY_TRACKING,
		repository: "secondary/repo",
		provider: "github-2",
	});
	const plugin = new IssueTrackerPlugin(app);
	await plugin.onload();
	t.after(() => plugin.onunload());
	await plugin.saveSettings();
	await plugin.sync();

	assert.deepEqual(
		app.vault
			.getFiles()
			.map((f) => f.path)
			.sort(),
		[
			"GitHub/owner/repo/Issue - 1.md",
			"GitHub/secondary/repo/Issue - 3.md",
		],
	);
});
