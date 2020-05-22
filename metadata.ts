import { ServiceIdent } from "./service.ts";

// Alias Reflect to prevent type errors
const Ref = Reflect as any;

const classTag = Symbol("class-tag");

enum MetadataTags {
  // Metadata tags used by TS.
  TsParamTypes = "design:paramtypes",
  TsType = "design:type",

  // Metadata tags used by this module.
  DiParamTypes = "di:paramtypes",
  DiClassTag = "di:classtag",
}

export type DesignType = object | undefined;

export interface DiParamTypes {
  prop: Map<string | symbol, ServiceIdent<any>>;
  param: Map<number, ServiceIdent<any>>;
}

export function getClassParamTypes(
  target: Function,
): DesignType[] | undefined {
  return Ref.getOwnMetadata(MetadataTags.TsParamTypes, target);
}

export function getMemberType(
  target: object,
  propKey: string | symbol,
): DesignType | undefined {
  return Ref.getMetadata(MetadataTags.TsType, target, propKey);
}

export function getDiClassParamTypes(
  target: Function,
): DiParamTypes | undefined {
  return Ref.getOwnMetadata(MetadataTags.DiParamTypes, target);
}

export function setDiClassParamTypes(
  target: Function,
  paramTypes: DiParamTypes,
): void {
  Ref.defineMetadata(MetadataTags.DiParamTypes, paramTypes, target);
}

export function isClassTagged(target: Function): boolean {
  const metadata = Ref.getOwnMetadata(MetadataTags.DiClassTag, target);

  return typeof metadata !== "undefined";
}

export function tagClass(target: Function) {
  Ref.defineMetadata(MetadataTags.DiClassTag, classTag, target);
}
