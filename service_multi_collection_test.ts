import "https://cdn.pika.dev/@abraham/reflection@^0.7.0";
import { assert, assertThrows } from "https://deno.land/std/testing/asserts.ts";
import { Service, ServiceCollection } from "./mod.ts";
import { ServiceMultiCollection } from "./service_multi_collection.ts";

Deno.test({
  name: "multi-collection can resolve from collections in order",
  fn() {
    @Service()
    class A {}

    @Service()
    class B {
      constructor(public a: A) {}
    }

    const c1 = new ServiceCollection();
    c1.addTransient(A);

    const c2 = new ServiceCollection();
    c2.addTransient(B);

    assertThrows(() => {
      c2.get(B);
    });

    const mc = new ServiceMultiCollection(c1, c2);

    const b = mc.get(B);
    assert(b instanceof B);
    assert(b.a instanceof A);
  },
});

Deno.test({
  name: "multi-collection can resolve bi-directionally",
  fn() {
    @Service()
    class A {}

    @Service()
    class B {
      constructor(public a: A) {}
    }

    @Service()
    class C {
      constructor(public b: B) {}
    }

    // Service collection setup
    const c1 = new ServiceCollection();
    c1.addTransient(A);
    c1.addTransient(C);

    const c2 = new ServiceCollection();
    c2.addTransient(B);

    // Multi-collection setup
    const multiCollection = new ServiceMultiCollection(c1, c2);

    // Resolve services across collections.
    const c = multiCollection.get(C);
    assert(c instanceof C);
    assert(c.b instanceof B);
    assert(c.b.a instanceof A);
  },
});
