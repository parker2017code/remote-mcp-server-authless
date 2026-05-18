import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

const INDEX_URL = "https://kaspaexplained.com/agent-index.json";
const CACHE_MS = 5 * 60 * 1000;
const MAX_TEXT_CHARS = 12_000;

type AgentIndex = {
	name: string;
	version: string;
	domain: string;
	scope: string;
	recommendedEntryPoints?: Record<string, string>;
	agentUse?: string[];
	mcpNote?: string;
	pages: PageDocument[];
	referenceFiles: ReferenceDocument[];
};

type PageDocument = {
	path: string;
	href: string;
	url: string;
	title: string;
	h1: string;
	description: string;
	dateModified: string;
	text: string;
};

type ReferenceDocument = {
	path: string;
	url: string;
	text: string;
};

type SearchDocument = {
	kind: "page" | "reference";
	path: string;
	url: string;
	title: string;
	description: string;
	dateModified: string;
	text: string;
};

type SearchResult = SearchDocument & {
	score: number;
	snippet: string;
};

let cachedIndex: { fetchedAt: number; index: AgentIndex } | undefined;

function normalizeText(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function termsFor(query: string): string[] {
	return Array.from(new Set(normalizeText(query).split(/\s+/).filter((term) => term.length >= 2)));
}

function pageTitle(page: PageDocument): string {
	return page.h1 || page.title || page.path;
}

function documentsFromIndex(index: AgentIndex): SearchDocument[] {
	const pages = index.pages.map((page) => ({
		kind: "page" as const,
		path: page.path,
		url: page.url,
		title: pageTitle(page),
		description: page.description,
		dateModified: page.dateModified,
		text: page.text,
	}));
	const references = index.referenceFiles.map((file) => ({
		kind: "reference" as const,
		path: file.path,
		url: file.url,
		title: file.path,
		description: "Kaspa Explained reference file",
		dateModified: index.version,
		text: file.text,
	}));
	return [...pages, ...references];
}

function scoreDocument(document: SearchDocument, query: string, terms: string[]): number {
	const haystack = normalizeText(
		[
			document.title,
			document.description,
			document.path,
			document.text.slice(0, 80_000),
		].join(" "),
	);
	const normalizedQuery = normalizeText(query);
	let score = haystack.includes(normalizedQuery) ? 12 : 0;
	for (const term of terms) {
		if (haystack.includes(term)) {
			score += 1;
		}
		if (normalizeText(document.title).includes(term)) {
			score += 4;
		}
		if (normalizeText(document.path).includes(term)) {
			score += 3;
		}
	}
	return score;
}

function snippetFor(text: string, terms: string[], maxLength = 520): string {
	const normalized = text.toLowerCase();
	const firstHit = terms
		.map((term) => normalized.indexOf(term.toLowerCase()))
		.filter((index) => index >= 0)
		.sort((a, b) => a - b)[0];
	const start = Math.max(0, (firstHit ?? 0) - 180);
	const snippet = text.slice(start, start + maxLength).replace(/\s+/g, " ").trim();
	return `${start > 0 ? "..." : ""}${snippet}${start + maxLength < text.length ? "..." : ""}`;
}

function searchIndex(index: AgentIndex, query: string, limit = 6): SearchResult[] {
	const terms = termsFor(query);
	const boundedLimit = Math.max(1, Math.min(limit, 10));
	return documentsFromIndex(index)
		.map((document) => ({
			...document,
			score: scoreDocument(document, query, terms),
			snippet: snippetFor(document.text, terms),
		}))
		.filter((result) => result.score > 0)
		.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
		.slice(0, boundedLimit);
}

function cleanTarget(value: string): string {
	return value
		.trim()
		.replace(/^https?:\/\/(www\.)?kaspaexplained\.com\/?/i, "")
		.replace(/^\//, "")
		.replace(/#.*$/, "")
		.replace(/\?.*$/, "");
}

function findDocument(index: AgentIndex, pathOrUrl: string): SearchDocument | undefined {
	const target = cleanTarget(pathOrUrl);
	const targetNoHtml = target.endsWith(".html") ? target.slice(0, -5) : target;
	return documentsFromIndex(index).find((document) => {
		const pathNoHtml = document.path.endsWith(".html") ? document.path.slice(0, -5) : document.path;
		const href = document.kind === "page" ? `/${pathNoHtml === "index" ? "" : pathNoHtml}` : `/${document.path}`;
		return (
			document.path === target ||
			pathNoHtml === targetNoHtml ||
			document.url === pathOrUrl.trim() ||
			href === `/${targetNoHtml}` ||
			normalizeText(document.title) === normalizeText(pathOrUrl)
		);
	});
}

function jsonText(value: unknown): { content: Array<{ type: "text"; text: string }> } {
	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(value, null, 2),
			},
		],
	};
}

async function loadIndex(): Promise<AgentIndex> {
	const now = Date.now();
	if (cachedIndex && now - cachedIndex.fetchedAt < CACHE_MS) {
		return cachedIndex.index;
	}
	const response = await fetch(INDEX_URL, {
		headers: {
			accept: "application/json",
			"user-agent": "kaspa-explained-mcp/1.0",
		},
	});
	if (!response.ok) {
		throw new Error(`Could not fetch ${INDEX_URL}: ${response.status} ${response.statusText}`);
	}
	const index = (await response.json()) as AgentIndex;
	cachedIndex = { fetchedAt: now, index };
	return index;
}

function sourceGuidance() {
	return [
		"Keep live mainnet, ecosystem-live, testnet, targeted, roadmap, research, and unsupported claims separate.",
		"Treat TN10/TN12 evidence as testnet evidence unless a primary mainnet activation source says otherwise.",
		"Do not provide price predictions or investment advice.",
		"This MCP server is read-only retrieval. It does not use embeddings, a vector database, or server-side LLM answering.",
	];
}

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Kaspa Explained",
		version: "2026-05-18",
	});

	async init() {
		this.server.registerTool("get_kaspa_explained_index", { inputSchema: {} }, async () => {
			const index = await loadIndex();
			return jsonText({
				name: index.name,
				version: index.version,
				scope: index.scope,
				domain: index.domain,
				recommendedEntryPoints: index.recommendedEntryPoints,
				agentUse: index.agentUse,
				mcpNote: index.mcpNote,
				documentCounts: {
					pages: index.pages.length,
					referenceFiles: index.referenceFiles.length,
				},
				guidance: sourceGuidance(),
			});
		});

		this.server.registerTool(
			"search_kaspa_explained",
			{
				inputSchema: {
					query: z.string().min(2),
					limit: z.number().int().min(1).max(10).optional(),
				},
			},
			async ({ query, limit }) => {
				const index = await loadIndex();
				const results = searchIndex(index, query, limit ?? 6).map((result) => ({
					title: result.title,
					path: result.path,
					url: result.url,
					kind: result.kind,
					dateModified: result.dateModified,
					score: result.score,
					snippet: result.snippet,
				}));
				return jsonText({
					query,
					indexVersion: index.version,
					results,
					guidance: sourceGuidance(),
				});
			},
		);

		this.server.registerTool(
			"read_kaspa_explained",
			{
				inputSchema: {
					pathOrUrl: z.string().min(1),
					maxCharacters: z.number().int().min(500).max(MAX_TEXT_CHARS).optional(),
				},
			},
			async ({ pathOrUrl, maxCharacters }) => {
				const index = await loadIndex();
				const document = findDocument(index, pathOrUrl);
				if (!document) {
					const suggestions = searchIndex(index, pathOrUrl, 5).map((result) => ({
						title: result.title,
						path: result.path,
						url: result.url,
					}));
					return jsonText({
						error: "No exact Kaspa Explained document matched pathOrUrl.",
						pathOrUrl,
						suggestions,
					});
				}
				const max = maxCharacters ?? 8_000;
				const text = document.text.slice(0, max);
				return jsonText({
					title: document.title,
					path: document.path,
					url: document.url,
					kind: document.kind,
					dateModified: document.dateModified,
					description: document.description,
					truncated: document.text.length > max,
					text,
					guidance: sourceGuidance(),
				});
			},
		);

		this.server.registerTool(
			"check_kaspa_claim",
			{
				inputSchema: {
					claim: z.string().min(3),
					limit: z.number().int().min(1).max(10).optional(),
				},
			},
			async ({ claim, limit }) => {
				const index = await loadIndex();
				const boostedQuery = `${claim} status claims checker Toccata TN10 TN12 mainnet roadmap research smart contracts`;
				const results = searchIndex(index, boostedQuery, limit ?? 7).map((result) => ({
					title: result.title,
					path: result.path,
					url: result.url,
					kind: result.kind,
					dateModified: result.dateModified,
					snippet: result.snippet,
				}));
				return jsonText({
					claim,
					indexVersion: index.version,
					read: [
						"https://kaspaexplained.com/status",
						"https://kaspaexplained.com/kaspa-claims-checker",
						"https://kaspaexplained.com/toccata-status",
						"https://kaspaexplained.com/CLAIMS.yml",
					],
					results,
					guidance: sourceGuidance(),
					note: "This tool retrieves relevant source passages. The calling agent should make the final claim classification from cited evidence.",
				});
			},
		);

		this.server.registerTool("get_kaspa_status_context", { inputSchema: {} }, async () => {
			const index = await loadIndex();
			const statusPages = ["status.html", "toccata-status.html", "kaspa-smart-contracts-status.html", "claims-reference.html"];
			const documents = statusPages
				.map((path) => findDocument(index, path))
				.filter((document): document is SearchDocument => document !== undefined)
				.map((document) => ({
					title: document.title,
					path: document.path,
					url: document.url,
					dateModified: document.dateModified,
					snippet: snippetFor(document.text, ["toccata", "mainnet", "testnet", "smart", "contract"], 900),
				}));
			return jsonText({
				indexVersion: index.version,
				statusContext: documents,
				guidance: sourceGuidance(),
			});
		});
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		if (url.pathname === "/" || url.pathname === "/health") {
			return Response.json({
				name: "Kaspa Explained MCP",
				status: "ok",
				endpoint: `${url.origin}/mcp`,
				index: INDEX_URL,
				tools: [
					"get_kaspa_explained_index",
					"search_kaspa_explained",
					"read_kaspa_explained",
					"check_kaspa_claim",
					"get_kaspa_status_context",
				],
			});
		}

		return new Response("Not found", { status: 404 });
	},
};
