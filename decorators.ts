import {
  DiParamTypes,
  getClassParamTypes,
  getDiClassParamTypes,
  getMemberType,
  isClassTagged,
  setDiClassParamTypes,
  tagClass,
} from "./metadata.ts";
import { isServiceIdent, ServiceIdent } from "./service.ts";

/**
 * Declares a class as a service that can be used with dependency injection.
 */
export function Service(): ClassDecorator {
  return (target: Function) => {
    if (isClassTagged(target)) {
      throw new Error("Cannot decorate class multiple times");
    }

    tagClass(target);
  };
}

/**
 * Used to declare a propery for injection, or to specify the service identifier
 * for a property or constructor parameter.
 * 
 * @remarks
 * All injection properties need this decorator with or without the identifier.
 *
 * If an identifier is not given, then the type of the property or parameter
 * must exist at runtime (i.e. it must be a class or abstract class).
 */
export function Inject<T = any>(
  ident?: ServiceIdent<T>,
) {
  return (
    target: object | Function,
    propKey: string | symbol | undefined,
    paramIndex?: number,
  ) => {
    const tgt = typeof target === "function" ? target : target.constructor;

    const metadata: DiParamTypes = getDiClassParamTypes(tgt) ??
      { prop: new Map(), param: new Map() };

    let cident: ServiceIdent<T> | undefined = ident;
    if (typeof paramIndex !== "undefined") {
      if (typeof cident === "undefined") {
        const designParams = getClassParamTypes(tgt);
        const designType = designParams?.[paramIndex];

        if (!isServiceIdent(designType)) {
          throw new Error(
            `Cannot determine type of parameter ${paramIndex} for class ${tgt.name}, either change the type or use Inject(type)`,
          );
        }

        cident = designType as ServiceIdent<T>;
      }

      metadata.param.set(paramIndex, cident);
    } else {
      if (typeof propKey === "undefined") {
        throw new Error(
          "Inject can only be used on properties and construct parameters",
        );
      }

      if (typeof cident === "undefined") {
        const designType = getMemberType(tgt.prototype, propKey);

        if (!isServiceIdent(designType)) {
          throw new Error(
            `Cannot determine type of property ${
              String(propKey)
            } for class ${tgt.name}, either chagen the type of use Inject(type)`,
          );
        }

        cident = designType as ServiceIdent<T>;
      }

      metadata.prop.set(propKey, cident);
    }

    setDiClassParamTypes(tgt, metadata);
  };
}
