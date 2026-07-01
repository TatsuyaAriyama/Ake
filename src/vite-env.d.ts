/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPTILER_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// geomagnetism has no bundled types
declare module 'geomagnetism' {
  interface GeomagnetismModel {
    point(coords: [number, number]): { decl: number };
  }
  export function model(date?: Date): GeomagnetismModel;
}
