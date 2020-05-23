import { isClassTagged } from "./metadata.ts";
import { resolve } from "./resolution.ts";
import {
  DynamicValue,
  Kind,
  Lifetime,
  Newable,
  Service,
  ServiceIdent,
  ServiceStore,
  StaticValue,
} from "./service.ts";

export class ServiceCollection {
  private _services: ServiceStore = new Map();

  public get<T>(ident: ServiceIdent<T>): T {
    return resolve(ident, [this._services]);
  }

  public addTransient<T>(impl: Newable<T>): void;
  public addTransient<T>(ident: ServiceIdent<T>, impl: Newable<T>): void;
  public addTransient<T>(ident: ServiceIdent<T>, impl?: Newable<T>) {
    this._addNewable(ident, newableImpl(ident, impl), Lifetime.Transient);
  }

  public addScoped<T>(impl: Newable<T>): void;
  public addScoped<T>(ident: ServiceIdent<T>, impl: Newable<T>): void;
  public addScoped<T>(ident: ServiceIdent<T>, impl?: Newable<T>) {
    this._addNewable(ident, newableImpl(ident, impl), Lifetime.Scoped);
  }

  public addSingleton<T>(impl: Newable<T>): void;
  public addSingleton<T>(ident: ServiceIdent<T>, impl: Newable<T>): void;
  public addSingleton<T>(ident: ServiceIdent<T>, impl?: Newable<T>) {
    this._addNewable(ident, newableImpl(ident, impl), Lifetime.Singleton);
  }

  public addTransientDynamic<T>(ident: ServiceIdent<T>, fn: DynamicValue) {
    this._addDynamic(ident, fn, Lifetime.Transient);
  }

  public addScopedDynamic<T>(ident: ServiceIdent<T>, fn: DynamicValue) {
    this._addDynamic(ident, fn, Lifetime.Scoped);
  }

  public addSingletonDynamic<T>(ident: ServiceIdent<T>, fn: DynamicValue) {
    this._addDynamic(ident, fn, Lifetime.Singleton);
  }

  public addStatic<T>(ident: ServiceIdent<T>, value: StaticValue) {
    this._add({
      kind: Kind.Static,
      ident,
      value,
    });
  }

  private _addNewable<T>(
    ident: ServiceIdent<T>,
    impl: Newable<T>,
    lifetime: Lifetime,
  ) {
    if (!isClassTagged(impl)) {
      throw new Error(
        `Class ${impl.name} has not been decorated with @Service`,
      );
    }

    this._add({
      kind: Kind.Newable,
      ident,
      lifetime,
      impl,
    });
  }

  private _addDynamic<T>(
    ident: ServiceIdent<T>,
    fn: DynamicValue,
    lifetime: Lifetime,
  ) {
    this._add({
      kind: Kind.Dynamic,
      ident,
      lifetime,
      fn,
    });
  }

  private _add(service: Service) {
    if (this._services.has(service.ident)) {
      throw new Error("Service already added to container");
    }

    this._services.set(service.ident, service);
  }
}

function newableImpl<T>(
  ident: ServiceIdent<T>,
  impl: Newable<T> | undefined,
): Newable<T> {
  if (!impl) {
    if (typeof ident !== "function") {
      throw new Error("Cannot self bind to a non-class");
    }

    return ident;
  }

  return impl;
}
