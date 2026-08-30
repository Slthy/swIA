import { describe, expect, it, vi } from "vitest";
import { dataInternals } from "@/lib/data";

describe("staff log pagination", () => {
  it("loads rows beyond Supabase's 1,000-row response cap", async () => {
    const rows = Array.from({ length: 2_005 }, (_, id) => id);
    const fetchPage = vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));

    await expect(dataInternals.collectPagedRows(fetchPage)).resolves.toEqual(rows);
    expect(fetchPage.mock.calls).toEqual([[0, 999], [1_000, 1_999], [2_000, 2_999]]);
  });

  it("surfaces a later page error instead of returning incomplete recent data", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1_000 }, (_, id) => id), error: null })
      .mockResolvedValueOnce({ data: [], error: { message: "page failed" } });

    await expect(dataInternals.collectPagedRows(fetchPage)).rejects.toThrow("page failed");
  });
});
