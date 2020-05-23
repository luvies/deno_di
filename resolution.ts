import { getClassParamTypes, getDiClassParamTypes } from "./metadata.ts";
import {
  Cacheable,
  isServiceIdent,
  Kind,
  Lifetime,
  LifetimedService,
  Service,
  ServiceIdent,
  ServiceStore,
} from "./service.ts";

function tryGet<T>(
  ident: ServiceIdent<T>,
  serviceStores: ServiceStore[],
): Service | undefined {
  for (const serviceMap of serviceStores) {
    const service = serviceMap.get(ident);

    if (service) {
      return service;
    }
  }

  return undefined;
}

interface Context {
  services: ServiceStore;
  cache: Map<ServiceIdent<any>, any | undefined>;
}

type ResolveParents = Set<ServiceIdent<any>>;

function loadFromCache<T>(
  ident: ServiceIdent<T>,
  service: Cacheable<T> & LifetimedService<any>,
  context: Context,
): T | undefined {
  switch (service.lifetime) {
    case Lifetime.Transient:
      return undefined;
    case Lifetime.Scoped:
      return context.cache.get(ident);
    case Lifetime.Singleton:
      return service.cache;
  }
}

function createUsingCache<T>(
  ident: ServiceIdent<T>,
  creator: () => T,
  service: Cacheable<T> & LifetimedService<any>,
  context: Context,
): T {
  const val = creator();

  switch (service.lifetime) {
    case Lifetime.Transient:
      break;
    case Lifetime.Scoped:
      context.cache.set(ident, val);
      break;
    case Lifetime.Singleton:
      service.cache = val;
  }

  return val;
}

function preventCircularGraph(
  ident: ServiceIdent<any>,
  parents: ResolveParents,
) {
  if (parents.has(ident)) {
    throw new Error(
      `Circular dependency detected: ${
        [...parents, ident].map((i) => String(i)).join(" -> ")
      }`,
    );
  }
}

function _resolve<T>(
  ident: ServiceIdent<T>,
  parents: ResolveParents,
  serviceStores: ServiceStore[],
  context: Context,
): T {
  const service = tryGet(ident, serviceStores);

  switch (service?.kind) {
    case Kind.Newable: {
      const cached = loadFromCache(ident, service as any, context);
      if (typeof cached !== "undefined") {
        return cached;
      }

      const manualDeps = getDiClassParamTypes(service.impl);
      const autoDeps = getClassParamTypes(service.impl);

      // Gather constructor arguments
      const args: any[] = [];
      if (autoDeps) {
        for (const [designType, i] of autoDeps.map((d, i) => [d, i] as const)) {
          const argIdent = manualDeps?.param.get(i) ?? designType;
          if (!isServiceIdent(argIdent)) {
            throw new Error(
              `Constructor parameter ${i} of class ${service.impl.name} is not a valid identifier`,
            );
          }

          preventCircularGraph(argIdent, parents);
          args.push(
            _resolve(
              argIdent,
              new Set([...parents, argIdent]),
              serviceStores,
              context,
            ),
          );
        }
      }

      // Gather prop values
      const props = new Map<string | symbol, any>();
      if (manualDeps) {
        for (const [propKey, propIdent] of manualDeps.prop) {
          preventCircularGraph(propIdent, parents);
          props.set(
            propKey,
            _resolve(
              propIdent,
              new Set([...parents, propIdent]),
              serviceStores,
              context,
            ),
          );
        }
      }

      return createUsingCache(
        ident,
        () => {
          const serv = new service.impl(...args);

          for (const [propKey, propVal] of props) {
            serv[propKey] = propVal;
          }

          return serv;
        },
        service,
        context,
      );
    }
    case Kind.Dynamic: {
      const val = loadFromCache(ident, service, context);

      return val ?? createUsingCache(ident, service.fn, service, context);
    }
    case Kind.Static: {
      return service.value;
    }
    case undefined:
      throw new Error(`Service ${String(ident)} does not exist in container`);
  }
}

export function resolve<T>(
  ident: ServiceIdent<T>,
  serviceStores: ServiceStore[],
): T {
  return _resolve(
    ident,
    new Set(),
    serviceStores,
    { services: new Map(), cache: new Map() },
  );
}
