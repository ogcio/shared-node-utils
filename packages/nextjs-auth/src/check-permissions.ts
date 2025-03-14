type ScopeMap = Map<string, ScopeMap | boolean>;

function getMapFromScope(scopes: string[]): ScopeMap {
  return scopes.reduce<ScopeMap>((acc, scope) => {
    const subScope = scope.split(":");
    let current: ScopeMap | boolean | undefined = acc;

    for (let i = 0; i < subScope.length; i++) {
      const part = subScope[i];

      if (current === true) break;

      if (current instanceof Map) {
        if (subScope[i + 1] === "*") {
          current.set(part, true);
          break;
        }

        if (i === subScope.length - 1) {
          current.set(part, true);
        } else if (!current.get(part)) {
          current.set(part, new Map());
        }

        current = current.get(part);
      }
    }

    return acc;
  }, new Map());
}

export function hasPermissions(
  scopes: string[],
  requiredPermissions: string[],
): boolean {
  const scopesMap = getMapFromScope(scopes);

  const grantAccess = requiredPermissions.some((p) =>
    validatePermission(p, scopesMap),
  );

  return grantAccess;
}

function validatePermission(permission: string, scope: ScopeMap): boolean {
  const parts = permission.split(":");

  let current: ScopeMap | boolean | undefined = scope;

  for (let i = 0; i <= parts.length; i++) {
    const part = parts[i];

    if (current === true) return true;

    if (current instanceof Map) {
      current = current.get(part);
    } else {
      return false;
    }
  }

  return false;
}
