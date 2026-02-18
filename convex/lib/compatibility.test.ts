import { describe, it, expect } from "vitest";
import { attractedTo, isGenderCompatible, isAgeCompatible } from "./compatibility";

describe("attractedTo", () => {
  it("straight man -> woman", () => {
    expect(attractedTo("Straight", "Man")).toEqual(["woman"]);
  });
  it("straight woman -> man", () => {
    expect(attractedTo("Straight", "Woman")).toEqual(["man"]);
  });
  it("gay man -> man", () => {
    expect(attractedTo("Gay", "Man")).toEqual(["man"]);
  });
  it("lesbian woman -> woman", () => {
    expect(attractedTo("Lesbian", "Woman")).toEqual(["woman"]);
  });
  it("bisexual -> all", () => {
    expect(attractedTo("Bisexual", "Woman")).toEqual(["man", "woman", "non-binary"]);
  });
  it("picker value Women -> woman", () => {
    expect(attractedTo("Women", "Man")).toEqual(["woman"]);
  });
  it("picker value Men -> man", () => {
    expect(attractedTo("Men", "Woman")).toEqual(["man"]);
  });
  it("picker value Everyone -> all", () => {
    expect(attractedTo("Everyone", "Man")).toEqual(["man", "woman", "non-binary"]);
  });
});

describe("isGenderCompatible", () => {
  it("straight man + straight woman = true", () => {
    const me = { sexuality: "Straight", gender: "Man" };
    const them = { sexuality: "Straight", gender: "Woman" };
    expect(isGenderCompatible(me, them)).toBe(true);
  });
  it("straight man + straight man = false", () => {
    const me = { sexuality: "Straight", gender: "Man" };
    const them = { sexuality: "Straight", gender: "Man" };
    expect(isGenderCompatible(me, them)).toBe(false);
  });
  it("gay man + gay man = true", () => {
    const me = { sexuality: "Gay", gender: "Man" };
    const them = { sexuality: "Gay", gender: "Man" };
    expect(isGenderCompatible(me, them)).toBe(true);
  });
  it("incomplete profile (missing sexuality) = true", () => {
    const me = { gender: "Man" };
    const them = { sexuality: "Straight", gender: "Woman" };
    expect(isGenderCompatible(me, them)).toBe(true);
  });
  it("bisexual woman + straight man = true", () => {
    const me = { sexuality: "Bisexual", gender: "Woman" };
    const them = { sexuality: "Straight", gender: "Man" };
    expect(isGenderCompatible(me, them)).toBe(true);
  });
});

describe("isAgeCompatible", () => {
  const birthdate30 = new Date(Date.now() - 30 * 365.25 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  it("age in range with dealbreaker = true", () => {
    expect(
      isAgeCompatible(
        { ageRangeDealbreaker: true, ageRangeMin: 25, ageRangeMax: 35 },
        { birthdate: birthdate30 },
      ),
    ).toBe(true);
  });
  it("age outside range with dealbreaker = false", () => {
    expect(
      isAgeCompatible(
        { ageRangeDealbreaker: true, ageRangeMin: 35, ageRangeMax: 45 },
        { birthdate: birthdate30 },
      ),
    ).toBe(false);
  });
  it("no dealbreaker flag = always true", () => {
    expect(
      isAgeCompatible(
        { ageRangeMin: 35, ageRangeMax: 45 },
        { birthdate: birthdate30 },
      ),
    ).toBe(true);
  });
  it("no birthdate = true", () => {
    expect(
      isAgeCompatible(
        { ageRangeDealbreaker: true, ageRangeMin: 25, ageRangeMax: 35 },
        {},
      ),
    ).toBe(true);
  });
  it("exactly at min boundary = true", () => {
    const birthdateAtMin = new Date(Date.now() - 25 * 365.25 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(
      isAgeCompatible(
        { ageRangeDealbreaker: true, ageRangeMin: 25, ageRangeMax: 35 },
        { birthdate: birthdateAtMin },
      ),
    ).toBe(true);
  });
});
