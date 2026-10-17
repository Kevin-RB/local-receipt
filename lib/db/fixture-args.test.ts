import { describe, expect, it } from "vitest";

import { FIXTURE_EMAIL } from "@/lib/db/fixture";
import {
  assertFixtureEnvironment,
  FixtureUsageError,
  parseFixtureOptions,
} from "@/lib/db/fixture-args";

const env = { NODE_ENV: "development" };

describe(parseFixtureOptions, () => {
  it("defaults to the agent test account", () => {
    expect(parseFixtureOptions([], env)).toStrictEqual({
      apply: false,
      email: FIXTURE_EMAIL,
      force: false,
    });
  });

  it("targets another account when one is named", () => {
    expect(
      parseFixtureOptions(["--email", "owner@example.com"], env).email
    ).toBe("owner@example.com");
  });

  it("rejects an invalid email address", () => {
    expect(() => parseFixtureOptions(["--email", "not-an-email"], env)).toThrow(
      FixtureUsageError
    );
  });

  it("rejects unknown flags", () => {
    expect(() =>
      parseFixtureOptions(["--email", "a@example.com", "--write"], env)
    ).toThrow(FixtureUsageError);
  });

  it("defaults to a dry run without force", () => {
    expect(
      parseFixtureOptions(["--email", "a@example.com"], env)
    ).toStrictEqual({
      apply: false,
      email: "a@example.com",
      force: false,
    });
  });

  it("normalizes the email", () => {
    expect(
      parseFixtureOptions(["--email", "  Owner@Example.com "], env).email
    ).toBe("owner@example.com");
  });

  it("opts in to writing and forcing with flags", () => {
    expect(
      parseFixtureOptions(
        ["--email", "a@example.com", "--apply", "--force"],
        env
      )
    ).toStrictEqual({ apply: true, email: "a@example.com", force: true });
  });
});

describe(assertFixtureEnvironment, () => {
  it("refuses production", () => {
    expect(() => assertFixtureEnvironment({ NODE_ENV: "production" })).toThrow(
      FixtureUsageError
    );
  });

  it("refuses an environment it cannot vouch for", () => {
    expect(() => assertFixtureEnvironment({})).toThrow(FixtureUsageError);
    expect(() => assertFixtureEnvironment({ NODE_ENV: "staging" })).toThrow(
      FixtureUsageError
    );
  });

  it("refuses production before any argument is checked", () => {
    expect(() => parseFixtureOptions([], { NODE_ENV: "production" })).toThrow(
      /production/u
    );
  });

  it("allows development and test", () => {
    expect(() =>
      assertFixtureEnvironment({ NODE_ENV: "development" })
    ).not.toThrow();
    expect(() => assertFixtureEnvironment({ NODE_ENV: "test" })).not.toThrow();
  });
});
