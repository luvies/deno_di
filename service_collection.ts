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

/**
 * A collection of services.
 */
export class ServiceCollection {
  private _services: ServiceStore = new Map();

  /**
   * Gets a service from the collection using the rest of the services in the
   * collection to resolve the dependencies.
   */
  public get<T>(ident: ServiceIdent<T>): T {
    return resolve(ident, [this._services]);
  }

  /**
   * Adds a class to the collection using itself as the identifier.
   * The service will be added with a transient lifetime.
   */
  public addTransient<T>(impl: Newable<T>): void;
  /**
   * Adds a class to the collection using a custom identifier.
   * The service will be added with a transient lifetime.
   */
  public addTransient<T>(ident: ServiceIdent<T>, impl: Newable<T>): void;
  /**
   * @ignore
   */
  public addTransient<T>(ident: ServiceIdent<T>, impl?: Newable<T>) {
    this._addNewable(ident, newableImpl(ident, impl), Lifetime.Transient);
  }

  /**
   * Adds a class to the collection using itself as the identifier.
   * The service will be added with a scoped lifetime.
   */
  public addScoped<T>(impl: Newable<T>): void;
  /**
   * Adds a class to the collection using a custom identifier.
   * The service will be added with a scoped lifetime.
   */
  public addScoped<T>(ident: ServiceIdent<T>, impl: Newable<T>): void;
  /**
   * @ignore
   */
  public addScoped<T>(ident: ServiceIdent<T>, impl?: Newable<T>) {
    this._addNewable(ident, newableImpl(ident, impl), Lifetime.Scoped);
  }

  /**
   * Adds a class to the collection using itself as the identifier.
   * The service will be added with a singleton lifetime.
   */
  public addSingleton<T>(impl: Newable<T>): void;
  /**
   * Adds a class to the collection using a custom identifier.
   * The service will be added with a singleton lifetime.
   */
  public addSingleton<T>(ident: ServiceIdent<T>, impl: Newable<T>): void;
  /**
   * @ignore
   */
  public addSingleton<T>(ident: ServiceIdent<T>, impl?: Newable<T>) {
    this._addNewable(ident, newableImpl(ident, impl), Lifetime.Singleton);
  }

  /**
   * Adds a function to the collection using a custom identifier.
   * The service will be added with a transient lifetime.
   */
  public addTransientDynamic<T>(ident: ServiceIdent<T>, fn: DynamicValue) {
    this._addDynamic(ident, fn, Lifetime.Transient);
  }

  /**
   * Adds a function to the collection using a custom identifier.
   * The service will be added with a scoped lifetime.
   */
  public addScopedDynamic<T>(ident: ServiceIdent<T>, fn: DynamicValue) {
    this._addDynamic(ident, fn, Lifetime.Scoped);
  }

  /**
   * Adds a function to the collection using a custom identifier.
   * The service will be added with a singleton lifetime.
   */
  public addSingletonDynamic<T>(ident: ServiceIdent<T>, fn: DynamicValue) {
    this._addDynamic(ident, fn, Lifetime.Singleton);
  }

  /**
   * Adds a static to the collection using a custom identifier.
   */
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
