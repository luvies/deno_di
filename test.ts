import "https://cdn.pika.dev/@abraham/reflection@^0.7.0";
import { assert, assertThrows } from "https://deno.land/std/testing/asserts.ts";
import { Inject, Service, ServiceContainer } from "./mod.ts";

function initServices(
  initFn: (services: ServiceContainer) => void,
): ServiceContainer {
  const services = new ServiceContainer();
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
  name: "explict types function",
  fn() {
    const aName = "a";
    const bSym = Symbol("b");

    @Service()
    class A {}

    @Service()
    class B {}

    @Service()
    class C {
      @Inject(aName)
      public a!: A;

      constructor(
        @Inject(bSym) public b: B,
      ) {}
    }

    const svs = initServices((s) => {
      s.addTransient(aName, A);
      s.addTransient(bSym, B);
      s.addTransient(C);
    });

    const c = svs.get(C);
    assert(c instanceof C);
    assert(c.a instanceof A);
    assert(c.b instanceof B);
  },
});

Deno.test({
  name: "validation",
  fn() {
    assertThrows(() => {
      @Service()
      @Service()
      class A {}
    });

    assertThrows(() => {
      @Service()
      class A {
        constructor(@Inject() a: object) {}
      }
    });

    assertThrows(() => {
      @Service()
      class A {
        @Inject()
        public a!: object;
      }
    });

    assertThrows(() => {
      const svs = new ServiceContainer();

      svs.get("unknown");
    });

    assertThrows(() => {
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
    });
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
