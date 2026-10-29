import { afterEach, describe, expect, it, vi } from "vitest";

import { Tf2AutobotClient } from "./tf2-autobot.client";

describe("Tf2AutobotClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filters an unsupported item without losing valid metadata and respects concurrency", async () => {
    let active = 0;
    let maximum = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: URL) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      const name = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      return new Response(JSON.stringify({ success: true, schemaItems: {
        defindex: 5021, item_name: name, item_type_name: name === "Unsupported" ? "" : "Tool",
        item_description: "Used to open crates.",
        image_url: "https://media.steampowered.com/apps/440/icons/key.png",
      } }), { headers: { "content-type": "application/json" } });
    }));
    const result = await new Tf2AutobotClient({ concurrency: 2, maximumBodyBytes: 10_000, requestTimeoutMs: 1_000, runTimeoutMs: 10_000 })
      .fetch({ game: "tf2", locale: "en", marketHashNames: ["Unsupported", "Key A", "Key B"] });
    expect(result.items.map((item) => item.marketHashName)).toEqual(["Key A", "Key B"]);
    expect(result.filteredOutCount).toBe(1);
    expect(maximum).toBe(2);
  });

  it("aborts a stalled run at the run deadline and does not return a partial snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: URL, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => { reject(new Error("aborted")); }, { once: true });
    })));
    await expect(new Tf2AutobotClient({ concurrency: 2, maximumBodyBytes: 10_000, requestTimeoutMs: 10_000, runTimeoutMs: 500 })
      .fetch({ game: "tf2", locale: "en", marketHashNames: ["Key A", "Key B"] })).rejects.toThrow();
  }, 2_000);

  it("fetches TF2 metadata target by target and skips 404 misses", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      success: true,
      schemaItems: {
        defindex: 5021,
        item_name: "Mann Co. Supply Crate Key",
        item_type_name: "Tool",
        image_url_large: "https://media.steampowered.com/apps/440/icons/key_large.png",
      },
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }))));

    const result = await new Tf2AutobotClient({
      concurrency: 1,
      maximumBodyBytes: 10_000,
      requestTimeoutMs: 1_000,
      runTimeoutMs: 10_000,
    }).fetch({
      game: "tf2",
      locale: "en",
      marketHashNames: ["Mann Co. Supply Crate Key"],
    });

    expect(result.items.map((item) => item.marketHashName)).toEqual(["Mann Co. Supply Crate Key"]);
    expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
