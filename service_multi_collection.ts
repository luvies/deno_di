import { resolve } from "./resolution.ts";
import { ServiceIdent, ServiceStore } from "./service.ts";
import { IServiceCollection, ServiceCollection } from "./service_collection.ts";

/**
 * Provides a mechanism to allow resolution of services from multiple
 * collections as-if they were one.
 */
export class ServiceMultiCollection implements IServiceCollection {
  private _serviceCollections: Set<ServiceCollection>;

  public constructor(...serviceCollections: ServiceCollection[]) {
    this._serviceCollections = new Set(serviceCollections);
  }

  /**
   * Resolves the service uses all the service collections currently
   * held.
   * 
   * @remarks
   * Resolution is done in priority order based on collection
   * insertion time, which means if 2 collections have the same service,
   * the collection that was added first will be the one that the service
   * will be resolved from.
   */
  public get<T>(ident: ServiceIdent<T>): T {
    const serviceStores = Array.from(this._serviceCollections).map((sc) =>
      (sc as any)._services as ServiceStore
    );
    return resolve(ident, serviceStores);
  }

  /**
   * Adds the given collections to the multi-collection in order.
   */
  public addCollections(...collections: ServiceCollection[]): void {
    for (const collection of collections) {
      this._serviceCollections.add(collection);
    }
  }

  /**
   * Removes the given collections from the multi-collection.
   */
  public removeCollections(...collections: ServiceCollection[]): void {
    for (const collection of collections) {
      this._serviceCollections.delete(collection);
    }
  }

  /**
   * Clears all held collections.
   */
  public clearCollections(): void {
    this._serviceCollections.clear();
  }
}
