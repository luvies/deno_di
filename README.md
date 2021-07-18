# Dependency Injection

![Build & Test](https://github.com/luvies/deno_di/workflows/Build%20&%20Test/badge.svg) [![nest badge](https://nest.land/badge.svg)](https://nest.land/package/di)

A dependency injection (inversion of control) module for Deno.

This is a work in-progress, and breaking changes may be made without warning.

Available at:

```
https://deno.land/x/di
```

```
https://nest.land/package/di
```

## Contents

- [API](#api)
  - [Services](#services)
  - [Newable Services](#newable-services)
    - [Abstract Classes](#abstract-classes)
  - [Dynamic Services](#dynamic-services)
  - [Static Services](#static-services)
  - [Lifetimes](#lifetimes)
  - [Service Multi-Collection](#service-multi-collection)
- [Setup](#setup)

## API

You can view the complete API using [docs.deno.land](https://doc.deno.land/https/deno.land/x/di/mod.ts).

Before you can use this module, follow the [setup](#setup) section, as this module relies on decorators and TypeScript's metadata system.

### Services

The main feature of this module is the `ServiceCollection`. This is a class which hold all your app's services in, and will resolve the dependencies of any requested service for you. Services can be one of the following:

- Newable
- Dynamic
- Static

To use the service collection, use some setup code like this near the start of your app:

```ts
const serviceCollection = new ServiceCollection();

// This is also showing the different lifetimes of a service and how each one
// may be bound to a name.
serviceCollection.addTransient(A);
serviceCollection.addScoped(IB, B);
serviceCollection.addSingleton(types.IC, C);
```

#### Newable Services

Newable services are just classes that have the `@Service()` decorator applied. These classes can delare their dependencies as constructor parameters or as properties:

```ts
// Service with no dependencies.
@Service()
class A {}

// Constructor injection
@Service()
class B {
  constructor(private a: A) {}
}

// Property injection.
@Service()
class C {
  @Inject()
  private a!: A;
}

// Service collection setup.
const serviceCollection = new ServiceCollection();
serviceCollection.addTransient(A);
serviceCollection.addTransient(B);
serviceCollection.addTransient(C);

const b = serviceCollection.get(B);
assert(b instanceof B);
assert(b.a instanceof A);

const c = serviceCollection.get(C);
assert(c instanceof C);
assert(c.a instanceof A);
```

For property injection, notice that it needed the `@Inject()` decorator. This decorator is used to either make TypeScript emit the design types for that property, and optionally to allow you to manually specify the type to be injected. This second feature is useful for interface injection (as interfaces do no exist at runtime):

```ts
// Type identifiers (these can also be strings).
const types = {
  IA: Symbol("IA"),
  IB: Symbol("IB"),
};

// Interfaces
interface IA {
  foo(): void;
}

interface IB {
  bar(): void;
}

// Implementations
@Service()
class A implements IA {
  public foo(): void {
    console.log("foo");
  }
}

@Service()
class B implements IB {
  // Using property injection.
  @Inject(types.IA)
  private propA!: IA;

  // Using constructor injection.
  constructor(
    @Inject(types.IA)
    private constructA: IA
  ) {}

  public bar(): void {
    console.log("bar");
  }
}

// Service collection setup.
const serviceCollection = new ServiceCollection();
serviceCollection.addTransient<IA>(types.IA, A);
serviceCollection.addTransient<IB>(types.IB, B);
```

##### Abstract Classes

Since interfaces do not exist at runtime, you have to manually specify the identifiers when declaring a dependency. This can become quite obtuse, and prevents good typing from being used. A better alternative is to use abstract classes. These classes cannot be instantiated (TypeScript prevents you from doing it), but can be used entirely as a replacement for interfaces that work with dependency type inference.

```ts
// Delcare the abstract classes
abstract class IA {
  foo(): void;
}

abstract class IB {
  bar(): void;
}

// Provide implementations.
class A implements IA {
  public foo() {
    console.log("foo");
  }
}

class B implements IB {
  constructor(
    // Notice how we can now infer the type, as it will exist at runtime.
    // This means we don't need to manually add @Inject decorators
    // (you still do with property injection, but you don't need the identifier argument).
    private a: IA
  ) {}

  public bar() {
    console.log("bar");
  }
}

// Service collection setup.
const serviceCollection = new ServiceCollection();
serviceCollection.addTransient(IA, A);
serviceCollection.addTransient(IB, B);

// We can then use the abstract class to instantiate the implementation without
// needing to do anything else. This also provides type inference, i.e.
// ib will be of type `IB`
const ib = serviceCollection.get(IB);
```

#### Dynamic Services

Dynamic services are just functions that are called when resolving the dependency tree, and the values of which are injected into the services.

```ts
const types = {
  data: Symbol("data"),
};

function getData(): string[] {
  return ["data"];
}

@Service()
class A {
  constructor(
    @Inject(types.data)
    private data: string[]
  ) {}
}

// Service collection setup.
const serviceCollection = new ServiceCollection();
serviceCollection.addTransientDynamic(types.data, getData);
serviceCollection.addTransient(A);

const a = serviceCollection.get(A);
assert(a instanceof A);
assertEquals(a.data, ["data"]);
```

#### Static Services

Static services are just pure values that are bound directly into the collection, and then can be used as a dependency by other services.

```ts
const types = {
  value: Symbol("value"),
};

const value = "static value";

@Service()
class A {
  constructor(
    @Inject(types.value)
    private value: string
  ) {}
}

// Service collection setup.
const serviceCollection = new ServiceCollection();
serviceCollection.addStatic(types.value, value);
serviceCollection.addTransient(A);

const a = serviceCollection.get(A);
assert(a instanceof A);
assertEquals(a.value, value);
```

### Lifetimes

Newable and dynamic services have 'lifetimes', which refers to how often it is instantiated or called when making a request.

#### Transient

For transient services, every single time it exists in the dependency tree, it is created again. This means that if you request service `A` from a collection, and it depends on `B` and `C`, which both depends on `D` (which is transient), then `D` will be created as new for both `B` and `C`.

#### Scoped

Scoped services are reused for the duration of the request. This means, using the example before, `D` (which is scoped now) would be the same instance between `B` and `C`, but if you requested `A` again, a new instance would be created.

#### Singleton

Singleton service are only ever created once, and this instance is reused throughout the entire lifetime of the `ServiceCollection`. Using the previous example again, but with `D` being a singleton, everytime you requested `A`, the instance of `D` is reused within and across requests.

### Service Multi-Collection

If you have multiple `ServiceCollection`s that you want to resolve a service from where dependencies may only exist in one or a subset, then you can use the `ServiceMultiCollection` class to treat all the `ServiceCollection`s as a single `ServiceCollection`.

A use-case for this is for something like a web-framework. When the framework loads, it would add all the controllers, middleware, and data service to a main service collection. Some of these services may depend on other services that contain request information. As multiple requests may be handled in parallel, it is not ideal to add the request-only services to the main collection, so you can instead create a second, request-only, collection, and use the `ServiceMultiCollection` to allow the main services and request-only services to resolve dependencies from each other.

Dependency resolution in this class can happen bi-directionally, meaning that each container may depend on services from the other (as long as it does not cause a circular dependency) without issue. However, services are resolved from collections in the order the collections were added to the multi-collection. This means that if you add collection `X` and _then_ collection `Y`, which both have service `A`, then `A` will be resolved from collection `X`, not `Y`, as it was added first. This allows a form a priority between collections.

Example:

```ts
// Services.
@Service()
class A {}

@Service()
class B {
  constructor(private a: A) {}
}

@Service()
class C {
  constructor(private b: B) {}
}

// Service collection setup
const collection1 = new ServiceCollection();
collection1.addTransient(A);
collection1.addTransient(C);

const collection2 = new ServiceCollection();
collection2.addTransient(B);

// Multi-collection setup
const multiCollection = new ServiceMultiCollection(collection1, collection2);

// Resolve services across collections.
const c = multiCollection.get(C);
assert(c instanceof C);
assert(c.b instanceof B);
assert(c.b.a instanceof A);
```

## Setup

This modules requires the following options to be set in the tsconfig:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

You will also need to polyfill Reflect metadata. The recommended way is:

```ts
import "https://cdn.skypack.dev/@abraham/reflection@0.8.0";
```
