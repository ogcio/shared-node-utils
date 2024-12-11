import { expect, test } from "vitest";
import {
  type ScopeMap,
  getMapFromScope,
  validatePermission,
} from "../src/utils.js";

const mapFromScopeTestCases: {
  description: string;
  scope: string;
  expected: ScopeMap;
}[] = [
  {
    description: "getMapFromScope: Single scope",
    scope: "payments:payment:create",
    expected: new Map([
      ["payments", new Map([["payment", new Map([["create", true]])]])],
    ]),
  },
  {
    description: "getMapFromScope: Single scope with wildcard",
    scope: "payments:payment:*",
    expected: new Map([["payments", new Map([["payment", true]])]]),
  },
  {
    description: "getMapFromScope: Multiple scopes",
    scope: "payments:payment:create payments:transaction:read",
    expected: new Map([
      [
        "payments",
        new Map([
          ["payment", new Map([["create", true]])],
          ["transaction", new Map([["read", true]])],
        ]),
      ],
    ]),
  },
  {
    description: "getMapFromScope: Multiple scopes with resource wildcard",
    scope: "payments:payment:create payments:* payments:transaction:read",
    expected: new Map([["payments", true]]),
  },
  {
    description: "getMapFromScope: Multiple scopes with action wildcard",
    scope:
      "payments:payment:create payments:transaction:* payments:transaction:read",
    expected: new Map([
      [
        "payments",
        new Map([
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          ["payment", new Map([["create", true]]) as any],
          ["transaction", true],
        ]),
      ],
    ]),
  },
];

for (const { description, scope, expected } of mapFromScopeTestCases) {
  test(description, () => {
    const result = getMapFromScope(scope);
    expect(result).toStrictEqual(expected);
  });
}

test("validatePermission: passes with wildcard scope", () => {
  const scope = "payments:payment:create payments:* payments:transaction:read";
  const permission = "payments:transaction:read";

  const result = validatePermission(permission, getMapFromScope(scope));
  expect(result).toBe(true);
});

test("validatePermission: does not pass", () => {
  const scope = "payments:payment:create payments:transaction:read";
  const permission = "payments:transaction:create";

  const result = validatePermission(permission, getMapFromScope(scope));
  expect(result).toBe(false);
});

test("validatePermission: passes with exact match", () => {
  const scope = "payments:payment:create payments:transaction:read";
  const permission = "payments:transaction:read";

  const result = validatePermission(permission, getMapFromScope(scope));
  expect(result).toBe(true);
});
