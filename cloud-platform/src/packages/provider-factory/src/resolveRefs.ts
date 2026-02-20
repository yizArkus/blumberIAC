import { isRef } from "@cloud-platform/shared";
import type { BaseContext } from "@cloud-platform/shared";

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc != null && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Recorre un objeto y reemplaza cualquier valor Ref por el valor del context.
 */
function resolveValue(value: unknown, context: Record<string, unknown>): unknown {
  if (isRef(value)) {
    return getByPath(context, value.ref);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, context));
  }
  if (value != null && typeof value === "object" && !("ref" in value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveValue(v, context);
    }
    return out;
  }
  return value;
}

/**
 * Resuelve las referencias en un descriptor y fusiona el baseContext.
 * Devuelve el objeto de argumentos listo para el adapter.
 */
export function resolveDescriptor(
  descriptor: Record<string, unknown>,
  context: Record<string, unknown>,
  baseContext: BaseContext
): Record<string, unknown> {
  const resolved = resolveValue(descriptor, context) as Record<string, unknown>;
  return {
    ...baseContext,
    ...resolved,
  };
}
