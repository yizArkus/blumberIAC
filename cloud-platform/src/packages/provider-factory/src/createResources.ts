import { getProvider } from "./ProviderFactory";
import { resolveDescriptor } from "./resolveRefs";
import type { IProviderAdapters } from "./types";
import type { ResourceDescriptor, BaseContext, BaseDescriptor } from "@cloud-platform/shared";

export type ResourceContext = Record<string, unknown>;

/**
 * Crea todos los recursos definidos en descriptors en orden.
 * Las salidas de cada recurso se guardan en el context con la clave descriptor.key ?? descriptor.name,
 * so other resources can reference them with { ref: "key.outputProperty" }.
 */
export function createResources(
  provider: "aws" | "azure" | "gcp",
  descriptors: ResourceDescriptor[],
  baseContext: BaseContext
): ResourceContext {
  const adapters = getProvider(provider) as IProviderAdapters;
  const context: ResourceContext = {};

  for (const descriptor of descriptors) {
    const d = descriptor as BaseDescriptor;
    const contextKey = d.key ?? d.name;
    const resolved = resolveDescriptor(
      descriptor as unknown as Record<string, unknown>,
      context as Record<string, unknown>,
      baseContext
    );
    const { type: _t, key: _k, ...args } = resolved;

    let outputs: unknown;
    const argsTyped = args as unknown;

    switch (descriptor.type) {
      case "network": {
        outputs = adapters.network.create(argsTyped as Parameters<IProviderAdapters["network"]["create"]>[0]);
        break;
      }
      case "loadBalancer": {
        outputs = adapters.loadBalancer.create(argsTyped as Parameters<IProviderAdapters["loadBalancer"]["create"]>[0]);
        break;
      }
      case "containerService": {
        outputs = adapters.containerService.create(argsTyped as Parameters<IProviderAdapters["containerService"]["create"]>[0]);
        break;
      }
      case "database": {
        outputs = adapters.database.create(argsTyped as Parameters<IProviderAdapters["database"]["create"]>[0]);
        break;
      }
      case "secrets": {
        outputs = adapters.secrets.create(argsTyped as Parameters<IProviderAdapters["secrets"]["create"]>[0]);
        break;
      }
      case "monitoring": {
        outputs = adapters.monitoring.create(argsTyped as Parameters<IProviderAdapters["monitoring"]["create"]>[0]);
        break;
      }
      case "cdn": {
        outputs = adapters.cdn.create(argsTyped as Parameters<IProviderAdapters["cdn"]["create"]>[0]);
        break;
      }
      case "dns": {
        outputs = adapters.dns.create(argsTyped as Parameters<IProviderAdapters["dns"]["create"]>[0]);
        break;
      }
      case "firewall": {
        outputs = adapters.firewall.create(argsTyped as Parameters<IProviderAdapters["firewall"]["create"]>[0]);
        break;
      }
      case "frontendHosting": {
        outputs = adapters.frontendHosting.create(argsTyped as Parameters<IProviderAdapters["frontendHosting"]["create"]>[0]);
        break;
      }
      default: {
        const _exhaustive: never = descriptor;
        throw new Error("Unknown resource type");
      }
    }

    context[contextKey] = outputs;
  }

  return context;
}
