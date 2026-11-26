import React, { ComponentType, useEffect, useState } from 'react';
import { View } from 'react-native';

type Importer = () => Promise<{ default: ComponentType<any> }>;

const moduleCache = new Map<string, { default: ComponentType<any> }>();
const inFlightImports = new Map<string, Promise<{ default: ComponentType<any> }>>();
const registeredImporters = new Map<string, Importer>();
const wrapperCache = new Map<string, ComponentType<any>>();

export function loadModulePromise(
  id: string,
  importer: Importer
): Promise<{ default: ComponentType<any> }> {
  const cached = moduleCache.get(id);
  if (cached) return Promise.resolve(cached);

  const existing = inFlightImports.get(id);
  if (existing) return existing;

  const p = importer()
    .then((mod) => {
      moduleCache.set(id, mod);
      inFlightImports.delete(id);
      return mod;
    })
    .catch((err) => {
      inFlightImports.delete(id);
      throw err;
    });

  inFlightImports.set(id, p);
  return p;
}

export function registerModuleForPrefetch(id: string, importer: Importer): void {
  registeredImporters.set(id, importer);
}

export function preloadModuleNow(id: string): void {
  if (moduleCache.has(id)) return;
  const importer = registeredImporters.get(id);
  if (!importer) return;
  loadModulePromise(id, importer).catch(() => {});
}

export function isModuleCached(id: string): boolean {
  return moduleCache.has(id);
}

/**
 * cacheAwareLazy
 *
 * Creates a stable wrapper component backed by an in-memory module cache.
 * - If pre-warmed (e.g. during post-paint idle), renders synchronously on Frame 1.
 * - If not cached yet, loads immediately on first mount with a transparent View
 *   inheriting Tab/Stack backgroundColor (zero white/grey flash).
 */
export function cacheAwareLazy(
  id: string,
  importer: Importer,
  FallbackComponent?: ComponentType<any>
): ComponentType<any> {
  registerModuleForPrefetch(id, importer);

  const existingWrapper = wrapperCache.get(id);
  if (existingWrapper) return existingWrapper;

  const Wrapper = (props: any) => {
    const [Comp, setComp] = useState<ComponentType<any> | null>(
      () => moduleCache.get(id)?.default ?? null
    );

    useEffect(() => {
      if (Comp) return;
      let isMounted = true;
      loadModulePromise(id, importer)
        .then((mod) => {
          if (isMounted) setComp(() => mod.default);
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }, []);

    if (!Comp) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return <View style={{ flex: 1 }} />;
    }

    return <Comp {...props} />;
  };

  Wrapper.displayName = `LazyScreen(${id})`;
  wrapperCache.set(id, Wrapper);
  return Wrapper;
}
