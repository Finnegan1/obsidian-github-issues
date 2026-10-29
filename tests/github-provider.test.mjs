import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
	entryPoints: ["src/providers/github/github-provider.ts"],
	bundle: true,
	platform: "node",
	format: "cjs",
	write: false,
});
const bundled = { exports: {} };
new Function("require", "module", "exports", outputFiles[0].text)(
	createRequire(import.meta.url),
	bundled,
	bundled.exports,
);
const { GitHubProvider } = bundled.exports;

function createProvider(baseUrl, token = "enterprise-token") {
	const config = {
		id: "github",
		type: "github",
		enabled: true,
		token,
		baseUrl,
	};
	const errors = [];
	const provider = new GitHubProvider(
		{ providers: [config] },
		{ error: (...args) => errors.push(args), debug: () => {} },
		() => config.token,
		config,
	);
	return { provider, config, errors };
}

function interceptRequests(t) {
	const requests = [];
	t.mock.method(globalThis, "fetch", async (url, options) => {
		requests.push({ url: String(url), ...options });
		const data = String(url).endsWith("graphql")
			? {
					data: {
						node: {
							fields: {
								nodes: [
									{
										name: "Status",
										options: [
											{
												id: "ready",
												name: "Ready",
												color: "GREEN",
												description: "Ready to start",
											},
										],
									},
								],
							},
						},
					},
				}
			: { login: "enterprise-user" };
		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	});
	return requests;
}

for (const baseUrl of [
	"https://github.example.com",
	" https://github.example.com/ ",
	"https://github.example.com/api/v3",
	"https://github.example.com/api/v3///",
]) {
	test(`Enterprise REST and Projects use the same instance: ${baseUrl}`, async (t) => {
		const requests = interceptRequests(t);
		const { provider, errors } = createProvider(baseUrl);
		assert.equal(
			await provider.fetchAuthenticatedUser(),
			"enterprise-user",
		);
		assert.deepEqual(
			await provider.fetchProjectStatusOptions("project-123"),
			[
				{
					id: "ready",
					name: "Ready",
					color: "GREEN",
					description: "Ready to start",
				},
			],
		);
		assert.deepEqual(errors, []);
		assert.equal(requests[0].url, "https://github.example.com/api/v3/user");
		assert.equal(requests[1].url, "https://github.example.com/api/graphql");
		assert.equal(requests[1].method, "POST");
		assert.equal(
			JSON.parse(requests[1].body).variables.projectId,
			"project-123",
		);
		assert.ok(
			requests.every(
				(request) =>
					request.headers.authorization === "token enterprise-token",
			),
		);
	});
}

test("Existing GitHub.com settings continue to use the public REST and GraphQL APIs", async (t) => {
	const requests = interceptRequests(t);
	const { provider } = createProvider(undefined);
	assert.equal(await provider.fetchAuthenticatedUser(), "enterprise-user");
	await provider.fetchProjectStatusOptions("project-123");
	assert.equal(requests[0].url, "https://api.github.com/user");
	assert.equal(requests[1].url, "https://api.github.com/graphql");
});

test("Changing the instance does not retain the old user or endpoint", async (t) => {
	const requests = interceptRequests(t);
	const { provider, config } = createProvider(undefined);
	await provider.fetchAuthenticatedUser();
	config.baseUrl = "https://github.example.com";
	provider.initializeClient();
	assert.equal(provider.getCurrentUser(), "");
	assert.equal(await provider.fetchAuthenticatedUser(), "enterprise-user");
	assert.equal(requests[1].url, "https://github.example.com/api/v3/user");
});

test("Removing a token stops authenticated requests instead of reusing the old client", async (t) => {
	const requests = interceptRequests(t);
	const { provider, config } = createProvider("https://github.example.com");
	await provider.fetchAuthenticatedUser();
	config.token = "";
	provider.initializeClient();
	assert.equal(provider.isReady(), false);
	assert.equal(provider.getCurrentUser(), "");
	assert.equal(await provider.fetchAuthenticatedUser(), "");
	assert.equal(requests.length, 1);
});

test("An invalid instance URL disables the previous client without sending its token elsewhere", async (t) => {
	const requests = interceptRequests(t);
	const { provider, config, errors } = createProvider(
		"https://github.example.com",
	);
	await provider.fetchAuthenticatedUser();
	for (const baseUrl of [
		"not-a-url",
		"file:///tmp/github",
		"https://github.example.com?token=secret",
		"https://user:password@github.example.com",
	]) {
		config.baseUrl = baseUrl;
		provider.initializeClient();
		assert.equal(provider.isReady(), false);
		assert.equal(await provider.fetchAuthenticatedUser(), "");
	}
	assert.equal(requests.length, 1);
	assert.equal(errors.length, 4);
});
