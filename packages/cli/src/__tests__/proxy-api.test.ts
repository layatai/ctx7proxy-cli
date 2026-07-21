import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getBaseUrl,
  getLibraryContext,
  resolveLibrary,
  setBaseUrl,
  setProxyUrl,
} from "../utils/api.js";

describe("custom Context7 proxy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.CONTEXT7_API_KEY;
    delete process.env.CONTEXT7_PROXY_TOKEN;
    setBaseUrl("https://context7.com");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("accepts the proxy MCP endpoint and routes API requests through its origin", async () => {
    setProxyUrl("http://127.0.0.1:3000/mcp");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    await resolveLibrary("react", "hooks");

    expect(getBaseUrl()).toBe("http://127.0.0.1:3000");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/api/v2/libs/search?libraryName=react&query=hooks",
      expect.any(Object)
    );
  });

  it("uses the dedicated proxy token without forwarding a Context7 API key", async () => {
    process.env.CONTEXT7_API_KEY = "ctx7-account-key";
    process.env.CONTEXT7_PROXY_TOKEN = "local-proxy-token";
    setProxyUrl("http://localhost:3000");
    vi.mocked(fetch).mockResolvedValue(new Response("docs", { status: 200 }));

    await getLibraryContext("/facebook/react", "hooks", { type: "txt" });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.headers).toMatchObject({ Authorization: "Bearer local-proxy-token" });
  });

  it.each([
    "ftp://localhost:3000",
    "http://user:secret@localhost:3000",
    "http://localhost:3000/api",
    "http://localhost:3000?token=secret",
  ])("rejects unsafe or unsupported proxy URL %s", (url) => {
    expect(() => setProxyUrl(url)).toThrow(/Proxy URL/);
  });
});
