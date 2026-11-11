import { createContextKey, type Middleware } from 'remix/router'

import type { AppRuntime } from '../runtime.ts'

export const Runtime = createContextKey<AppRuntime>()

/** Makes the app's Effect runtime available to controllers (through `respond`). */
export function provideRuntime(runtime: AppRuntime): Middleware<{ key: typeof Runtime; value: AppRuntime }> {
  return (context, next) => {
    context.set(Runtime, runtime)
    return next()
  }
}
