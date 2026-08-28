import { describe, expect, it } from "vitest";
import { normalizeUsername } from "@/lib/utils";

describe("username normalization", () => {
  it("uses first name and hyphenated surname", () => expect(normalizeUsername("Nerea Gutierrez-Steinhauer")).toBe("nerea.gutierrez-steinhauer"));
  it("joins multi-part surnames", () => expect(normalizeUsername("Test Van Buren")).toBe("test.van-buren"));
});
