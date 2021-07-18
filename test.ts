import "https://cdn.skypack.dev/@abraham/reflection@0.8.0";
import {
  assert,
  assertThrows,
} from "https://deno.land/std@0.101.0/testing/asserts.ts";
import { Inject, Service, ServiceCollection } from "./mod.ts";

function initServices(
  initFn: (services: ServiceCollection) => void,
): ServiceCollection {
  const services = new ServiceCollection();
  initFn(services);
  return services;
}

function singleDirectClasses() {
  @Service()
  class A {}

  @Service()
  class B {
    constructor(public a: A) {}
  }

  return [A, B] as const;
}

Deno.test({
  name: "transient direct classes",
  fn() {
    const [A, B] = singleDirectClasses();

    const svs = initServices((s) => {
      s.addTransient(A);
      s.addTransient(B);
    });

    const b1 = svs.get(B);
    assert(b1 instanceof B);
    assert(b1.a instanceof A);

    const b2 = svs.get(B);
    assert(b2 instanceof B);
    assert(b2.a instanceof A);
    assert(b1 !== b2);
    assert(b1.a !== b2.a);
  },
});

Deno.test({
  name: "scoped direct classes",
  fn() {
    const [A, B] = singleDirectClasses();

    const svs = initServices((s) => {
      s.addScoped(A);
      s.addScoped(B);
    });

    const b1 = svs.get(B);
    assert(b1 instanceof B);
    assert(b1.a instanceof A);

    const b2 = svs.get(B);
    assert(b2 instanceof B);
    assert(b2.a instanceof A);
    assert(b1 !== b2);
    assert(b1.a !== b2.a);
  },
});

Deno.test({
  name: "singleton direct classes",
  fn() {
    const [A, B] = singleDirectClasses();

    const svs = initServices((s) => {
      s.addSingleton(A);
      s.addSingleton(B);
    });

    const b1 = svs.get(B);
    assert(b1 instanceof B);
    assert(b1.a instanceof A);

    const b2 = svs.get(B);
    assert(b2 instanceof B);
    assert(b2.a instanceof A);
    assert(b1 === b2);
    assert(b1.a === b2.a);
  },
});

function multipleDirectClasses() {
  @Service()
  class A {}

  @Service()
  class B {
    constructor(public a1: A, public a2: A) {}
  }

  return [A, B] as const;
}

Deno.test({
  name: "transient multiple direct",
  fn() {
    const [A, B] = multipleDirectClasses();

    const svs = initServices((s) => {
      s.addTransient(A);
      s.addTransient(B);
    });

    const b1 = svs.get(B);
    assert(b1 instanceof B);
    assert(b1.a1 instanceof A);
    assert(b1.a2 instanceof A);
    assert(b1.a1 !== b1.a2);

    const b2 = svs.get(B);
    assert(b2 instanceof B);
    assert(b2.a1 instanceof A);
    assert(b2.a2 instanceof A);
    assert(b2.a1 !== b2.a2);

    assert(b1 !== b2);
  },
});

Deno.test({
  name: "scoped multiple direct",
  fn() {
    const [A, B] = multipleDirectClasses();

    const svs = initServices((s) => {
      s.addScoped(A);
      s.addScoped(B);
    });

    const b1 = svs.get(B);
    assert(b1 instanceof B);
    assert(b1.a1 instanceof A);
    assert(b1.a2 instanceof A);
    assert(b1.a1 === b1.a2);

    const b2 = svs.get(B);
    assert(b2 instanceof B);
    assert(b2.a1 instanceof A);
    assert(b2.a2 instanceof A);
    assert(b2.a1 === b2.a2);

    assert(b1 !== b2);
  },
});

Deno.test({
  name: "singleton multiple direct",
  fn() {
    const [A, B] = multipleDirectClasses();

    const svs = initServices((s) => {
      s.addSingleton(A);
      s.addSingleton(B);
    });

    const b1 = svs.get(B);
    assert(b1 instanceof B);
    assert(b1.a1 instanceof A);
    assert(b1.a2 instanceof A);
    assert(b1.a1 === b1.a2);

    const b2 = svs.get(B);
    assert(b2 instanceof B);
    assert(b2.a1 instanceof A);
    assert(b2.a2 instanceof A);
    assert(b2.a1 === b2.a2);

    assert(b1 === b2);
  },
});

Deno.test({
  name: "property injection",
  fn() {
    @Service()
    class A {}

    @Service()
    class B {
      @Inject()
      public a!: A;
    }

    const svs = initServices((s) => {
      s.addTransient(A);
      s.addTransient(B);
    });

    const b1 = svs.get(B);
    assert(b1 instanceof B);
    assert(b1.a instanceof A);

    const b2 = svs.get(B);
    assert(b2 instanceof B);
    assert(b2.a instanceof A);

    assert(b1 !== b2);
    assert(b1.a !== b2.a);
  },
});

Deno.test({
  name: "explict types functionality",
  fn() {
    const aName = "a";
    const bSym = Symbol("b");
    const cSym = Symbol("c");

    interface IA {
      propA: string;
    }

    interface IB {
      propB: string;
    }

    interface IC {
      propC: string;
    }

    @Service()
    class A implements IA {
      public propA = "prop A";
    }

    @Service()
    class B implements IB {
      public propB = "prop B";
    }

    @Service()
    class C implements IC {
      @Inject(aName)
      public a!: A;

      public propC = "prop C";

      constructor(
        @Inject(bSym) public b: B,
      ) {}
    }

    const svs = initServices((s) => {
      s.addTransient<IA>(aName, A);
      s.addTransient<IB>(bSym, B);
      s.addTransient<IC>(cSym, C);
    });

    const c = svs.get<IC>(cSym);
    assert(c instanceof C);
    assert(c.propC === "prop C");
    assert(c.a instanceof A);
    assert(c.a.propA === "prop A");
    assert(c.b instanceof B);
    assert(c.b.propB === "prop B");
  },
});

Deno.test({
  name: "validation - double Service decorator",
  fn() {
    assertThrows(
      () => {
        @Service()
        @Service()
        class A {}
      },
      undefined,
      "multiple times",
    );
  },
});

Deno.test({
  name: "validation - bad constructor type",
  fn() {
    assertThrows(
      () => {
        @Service()
        class A {
          constructor(@Inject() a: object) {}
        }
      },
      undefined,
      "Cannot determine type of parameter",
    );
  },
});

Deno.test({
  name: "validation - bad property type",
  fn() {
    assertThrows(
      () => {
        @Service()
        class A {
          @Inject()
          public a!: object;
        }
      },
      undefined,
      "Cannot determine type of property",
    );
  },
});

Deno.test({
  name: "validation - unknown service",
  fn() {
    assertThrows(
      () => {
        const svs = new ServiceCollection();

        svs.get("unknown");
      },
      undefined,
      "does not exist in container",
    );
  },
});

Deno.test({
  name: "validation - missing dependency",
  fn() {
    assertThrows(
      () => {
        @Service()
        class A {}

        @Service()
        class B {
          constructor(public a: A) {}
        }

        const svs = initServices((s) => {
          s.addTransient(B);
        });

        svs.get(B);
      },
      undefined,
      "does not exist in container",
    );
  },
});

Deno.test({
  name: "validation - missing Service decorator",
  fn() {
    assertThrows(
      () => {
        class A {}

        initServices((s) => s.addTransient(A));
      },
      undefined,
      "has not been decorated with @Service",
    );
  },
});

Deno.test({
  name: "validation - cyclic dependency",
  fn() {
    assertThrows(
      () => {
        const types = {
          a: Symbol("a"),
          b: Symbol("b"),
          c: Symbol("c"),
        };

        @Service()
        class A {
          constructor(
            @Inject(types.c) public c: any,
          ) {}
        }

        @Service()
        class B {
          constructor(
            @Inject(types.a) public a: A,
          ) {}
        }

        @Service()
        class C {
          constructor(
            @Inject(types.b) public b: B,
          ) {}
        }

        const svs = initServices((s) => {
          s.addTransient(types.a, A);
          s.addTransient(types.b, B);
          s.addTransient(types.c, C);
        });

        svs.get(types.c);
      },
      undefined,
      "Circular dependency detected",
    );
  },
});

Deno.test({
  name: "dynamic transient binding",
  fn() {
    let i = 0;
    const fn = () => i++;

    @Service()
    class A {
      constructor(@Inject("fn") public count: number) {}
    }

    const svs = initServices((s) => {
      s.addTransientDynamic("fn", fn);
      s.addTransient(A);
    });

    const a1 = svs.get(A);
    assert(a1 instanceof A);
    assert(a1.count === 0);
    assert(i === 1);

    const a2 = svs.get(A);
    assert(a2 instanceof A);
    assert(a2.count === 1);
    assert(i === 2 as any);
  },
});

Deno.test({
  name: "dynamic singleton binding",
  fn() {
    let i = 0;
    const fn = () => i++;

    @Service()
    class A {
      constructor(@Inject("fn") public count: number) {}
    }

    const svs = initServices((s) => {
      s.addSingletonDynamic("fn", fn);
      s.addTransient(A);
    });

    const a1 = svs.get(A);
    assert(a1 instanceof A);
    assert(a1.count === 0);
    assert(i === 1);

    const a2 = svs.get(A);
    assert(a2 instanceof A);
    assert(a2.count === 0);
    assert(i === 1);
  },
});

Deno.test({
  name: "static binding",
  fn() {
    const val = "test value";

    @Service()
    class A {
      constructor(@Inject("val") public v: string) {}
    }

    const svs = initServices((s) => {
      s.addStatic("val", val);
      s.addTransient(A);
    });

    const a = svs.get(A);
    assert(a instanceof A);
    assert(a.v === val);
  },
});

Deno.test({
  name: "deep complex nested",
  fn() {
    // Interfaces
    abstract class IA {}
    abstract class IB {}
    abstract class IC {}
    abstract class ID {}
    abstract class IE {}

    // Impls
    @Service() // transient
    class A implements IA {}

    @Service() // singleton
    class B implements IB {
      constructor(public a: IA) {}
    }

    @Service() // scoped
    class C implements IC {
      constructor(public b: IB, public a: IA) {}
    }

    @Service() // transient
    class D implements ID {
      constructor(public c: IC, public b: IB) {}
    }

    @Service() // transient
    class E implements IE {
      constructor(public d1: ID, public d2: ID) {}
    }

    // Container setup
    const svs = initServices((s) => {
      s.addTransient(IA, A);
      s.addSingleton(IB, B);
      s.addScoped(IC, C);
      s.addTransient(ID, D);
      s.addTransient(IE, E);
    });

    const e1 = svs.get(IE);
    assert(e1 instanceof E);
    assert(e1.d1 instanceof D);
    assert(e1.d1.b instanceof B);
    assert(e1.d1.b.a instanceof A);
    assert(e1.d1.c instanceof C);
    assert(e1.d1.c.a instanceof A);
    assert(e1.d1.c.b instanceof B);
    assert(e1.d1.c.b.a instanceof A);

    assert(e1.d2 instanceof D);
    assert(e1.d2.b instanceof B);
    assert(e1.d2.b.a instanceof A);
    assert(e1.d2.c instanceof C);
    assert(e1.d2.c.a instanceof A);
    assert(e1.d2.c.b instanceof B);
    assert(e1.d2.c.b.a instanceof A);

    assert(e1.d1 !== e1.d2);
    assert(e1.d1.b === e1.d2.b);
    assert(e1.d1.b.a === e1.d2.b.a);
    assert(e1.d1.c === e1.d2.c);
    assert(e1.d1.c.a === e1.d2.c.a);
    assert(e1.d1.c.b === e1.d2.c.b);
    assert(e1.d1.c.b === e1.d1.b);
    assert(e1.d1.c.b === e1.d2.b);
    assert(e1.d2.c.b === e1.d1.b);
    assert(e1.d2.c.b === e1.d2.b);
    assert(e1.d1.c.b.a === e1.d2.c.b.a);

    const e2 = svs.get(IE);
    assert(e2 instanceof E);
    assert(e2.d1 instanceof D);
    assert(e2.d1.b instanceof B);
    assert(e2.d1.b.a instanceof A);
    assert(e2.d1.c instanceof C);
    assert(e2.d1.c.a instanceof A);
    assert(e2.d1.c.b instanceof B);
    assert(e2.d1.c.b.a instanceof A);

    assert(e2.d2 instanceof D);
    assert(e2.d2.b instanceof B);
    assert(e2.d2.b.a instanceof A);
    assert(e2.d2.c instanceof C);
    assert(e2.d2.c.a instanceof A);
    assert(e2.d2.c.b instanceof B);
    assert(e2.d2.c.b.a instanceof A);

    assert(e2.d1 !== e2.d2);
    assert(e2.d1.b === e2.d2.b);
    assert(e2.d1.b.a === e2.d2.b.a);
    assert(e2.d1.c === e2.d2.c);
    assert(e2.d1.c.a === e2.d2.c.a);
    assert(e2.d1.c.b === e2.d2.c.b);
    assert(e2.d1.c.b === e2.d1.b);
    assert(e2.d1.c.b === e2.d2.b);
    assert(e2.d2.c.b === e2.d1.b);
    assert(e2.d2.c.b === e2.d2.b);
    assert(e2.d1.c.b.a === e2.d2.c.b.a);

    assert(e1 !== e2);
    assert(e1.d1 !== e2.d1);
    assert(e1.d2 !== e2.d2);
    assert(e1.d1 !== e2.d2);
    assert(e1.d1.b === e2.d1.b);
    assert(e1.d1.c !== e2.d1.c);
    assert(e1.d1.c.a !== e2.d1.c.a);
    assert(e1.d1.c.b === e2.d1.c.b);
  },
});
