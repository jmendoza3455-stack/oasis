import { describe, expect, it } from "vitest";
import { pickVenue } from "@/lib/venue-select";

const venues = [{ slug: "oasis-pachacamac" }, { slug: "otro-local" }];

describe("local del back-office", () => {
  it("respeta la elección solo si el usuario tiene acceso", () => {
    expect(pickVenue(venues, "otro-local", "oasis-pachacamac")?.slug).toBe("otro-local");
    expect(pickVenue(venues, "local-ajeno", "oasis-pachacamac")?.slug).toBe("oasis-pachacamac");
    expect(pickVenue(venues, undefined, "oasis-pachacamac")?.slug).toBe("oasis-pachacamac");
  });

  it("sin el local por defecto usa el primero; sin locales, ninguno", () => {
    expect(pickVenue([{ slug: "otro-local" }], undefined, "oasis-pachacamac")?.slug).toBe(
      "otro-local",
    );
    expect(pickVenue([], "otro-local", "oasis-pachacamac")).toBeNull();
  });
});
