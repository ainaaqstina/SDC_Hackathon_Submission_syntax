import { beforeEach, describe, expect, it, vi } from "vitest";

const connectorMock = vi.hoisted(() => ({ proxy: vi.fn() }));

vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class {
    proxy(...args: unknown[]) {
      return connectorMock.proxy(...args);
    }
  },
}));

import { fetchTheirStackListings, TheirStackApiError } from "./theirstack";

describe("TheirStack listing adapter", () => {
  beforeEach(() => connectorMock.proxy.mockReset());

  it("searches the requested country and maps only the fields CareerLens stores", async () => {
    connectorMock.proxy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          metadata: {},
          data: [
            {
              id: "job-1",
              job_title: "Registered Nurse",
              url: "https://jobs.example.test/role",
              date_posted: "2026-10-24",
              location: "Singapore",
              description: "This description is intentionally not persisted.",
              company_object: { name: "Example Hospital", industry: "Hospitals and Health Care" },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchTheirStackListings("sg", 30, 10);

    expect(connectorMock.proxy).toHaveBeenCalledWith(
      "theirstack",
      "/v1/jobs/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          posted_at_max_age_days: 30,
          job_country_code_or: ["SG"],
          limit: 10,
          page: 0,
        }),
      }),
    );
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({
      externalId: "job-1",
      title: "Registered Nurse",
      company: "Example Hospital",
      industry: "Hospitals and Health Care",
      listingUrl: "https://jobs.example.test/role",
    });
    expect(result.listings[0]).not.toHaveProperty("description");
    expect(result.providerTotalResults).toBeNull();
    expect(result.creditsConsumed).toBe(1);
  });

  it("skips malformed records and unsafe URLs rather than importing them", async () => {
    connectorMock.proxy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { id: "unsafe", job_title: "Bad link", url: "javascript:alert(1)" },
            { id: "no-title", url: "https://jobs.example.test/role" },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchTheirStackListings("SG", 30, 10);
    expect(result.listings).toHaveLength(0);
    expect(result.skipped).toBe(2);
    expect(result.creditsConsumed).toBe(2);
  });

  it("returns a clear no-credit error without exposing provider response contents", async () => {
    connectorMock.proxy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "private provider details" }), { status: 402 }),
    );

    await expect(fetchTheirStackListings("SG", 30, 10)).rejects.toMatchObject({
      name: "TheirStackApiError",
      statusCode: 503,
      message: "TheirStack has no API credits available for this search.",
    } satisfies Partial<TheirStackApiError>);
  });
});
