import { Layer, ManagedRuntime } from 'effect'

import { AppConfig } from '../services/config.ts'
import { Database } from '../services/database.ts'

/** What the app's services need from outside. Production reads it from the environment. */
export type Base = AppConfig

/** The live base: configuration from the environment. */
export const LiveBase = AppConfig.layer

/**
 * Every service controllers may use, wired onto a base. Tests pass a base that points at a
 * throwaway database; production passes `LiveBase`.
 */
export function makeAppLayer<E>(base: Layer.Layer<Base, E>) {
  return Database.layer.pipe(
    // The base stays visible to controllers too (e.g. the public address, for links).
    Layer.provideMerge(base),
  )
}

export type AppServices = Layer.Success<ReturnType<typeof makeAppLayer>>

/** A runtime whose services are already built, so running a program can't fail on setup. */
export type AppRuntime = ManagedRuntime.ManagedRuntime<AppServices, never>

/**
 * Builds every service up front (one runtime per server, or per test app), so a bad config or
 * a failed migration stops startup here rather than on the first request. Dispose it on shutdown.
 * @throws the layer's error (e.g. a missing DATABASE_URL, or a migration that failed)
 */
export async function startRuntime<E>(base: Layer.Layer<Base, E>): Promise<AppRuntime> {
  const runtime = ManagedRuntime.make(makeAppLayer(base))
  await runtime.context()
  // Built: the layer error can no longer occur when programs run.
  return runtime as unknown as AppRuntime
}
