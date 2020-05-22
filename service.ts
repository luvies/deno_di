export enum Lifetime {
  Transient,
  Scoped,
  Singleton,
}

export enum Kind {
  Newable,
  Dynamic,
  Static,
}

export interface Newable<T> {
  new (...args: any[]): T;
}

export interface Abstract<T> {
  prototype: T;
}

export type ServiceIdent<T> =
  | string
  | symbol
  | Newable<T>
  | Abstract<T>;

export function isServiceIdent<T>(ident: unknown): ident is ServiceIdent<T> {
  if (typeof ident === "string" || typeof ident === "symbol") {
    return true;
  }

  if (typeof ident === "function") {
    return ident !== Object;
  }

  return false;
}

export interface GenericService<T extends Kind> {
  kind: T;
  ident: ServiceIdent<any>;
}

export interface LifetimedService<T extends Kind> extends GenericService<T> {
  lifetime: Lifetime;
}

export interface Cacheable<T> {
  cache?: T;
}

export interface NewableService
  extends LifetimedService<Kind.Newable>, Cacheable<Newable<any>> {
  impl: Newable<any>;
}

export type DynamicValue = () => any;

export interface DynamicService
  extends LifetimedService<Kind.Dynamic>, Cacheable<any> {
  fn: DynamicValue;
}

export type StaticValue = any;

export interface StaticService extends GenericService<Kind.Static> {
  value: StaticValue;
}

export type Service = NewableService | DynamicService | StaticService;

export type ServiceCollection = Map<ServiceIdent<any>, Service>;
