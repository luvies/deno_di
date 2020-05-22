# Dependency Injection

![CI](https://github.com/luvies/deno_di/workflows/Build%20&%20Test/badge.svg)

A dependency injection (inversion of control) module for Deno.

This is a work in-progress. See [test.ts](./test.ts) for some usage and [service_container.ts](./service_container.ts) and [decorators.ts](./decorators.ts) for the current API.

## Usage

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
import "https://cdn.pika.dev/@abraham/reflection@^0.7.0";
```
