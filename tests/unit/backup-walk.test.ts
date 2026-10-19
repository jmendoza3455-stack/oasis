import { describe, expect, it } from "vitest";
import { walkBucket, type StorageEntry } from "@/lib/backup/walk";

describe("walkBucket", () => {
  it("recorre carpetas anidadas, pagina e ignora marcadores", async () => {
    const tree: Record<string, StorageEntry[]> = {
      "": [
        { name: "vouchers", id: null },
        { name: "readme.pdf", id: "1" },
      ],
      vouchers: [
        { name: "b1", id: null },
        { name: ".emptyFolderPlaceholder", id: "x" },
      ],
      "vouchers/b1": Array.from({ length: 3 }, (_, i) => ({ name: `v${i}.png`, id: `v${i}` })),
    };
    const list = async (prefix: string, offset: number) =>
      (tree[prefix] ?? []).slice(offset, offset + 2);
    expect((await walkBucket(list, "", 2)).sort()).toEqual([
      "readme.pdf",
      "vouchers/b1/v0.png",
      "vouchers/b1/v1.png",
      "vouchers/b1/v2.png",
    ]);
  });
});
