/**
 * App configuration from the environment, validated when the runtime starts: a bad or missing
 * value stops startup with a clear message instead of failing on the first request.
 */
import { Config, Context, Effect, Layer, Redacted } from 'effect'

export interface AppConfigValues {
  /** Postgres connection string for the database the app reads and writes. */
  readonly databaseUrl: Redacted.Redacted<string>
  /** The address people reach the app at, e.g. `https://crossline.example.org` (no trailing slash). */
  readonly publicUrl: URL
}

export class AppConfig extends Context.Service<AppConfig, AppConfigValues>()('crossline/services/AppConfig') {
  /** Reads `DATABASE_URL` and `PUBLIC_URL`. Fails at startup when either is missing or malformed. */
  static readonly layer = Layer.effect(
    AppConfig,
    Effect.gen(function* () {
      const databaseUrl = yield* Config.Redacted('DATABASE_URL')
      const publicUrl = yield* Config.NonEmptyString('PUBLIC_URL')
      if (!URL.canParse(publicUrl)) {
        return yield* Effect.die(new Error(`PUBLIC_URL is not a valid URL: ${publicUrl}`))
      }
      return AppConfig.of({ databaseUrl, publicUrl: new URL(publicUrl) })
    }),
  )

  /**
   * A fixed configuration, for tests.
   * @param values `databaseUrl` as plain text; `publicUrl` defaults to `http://localhost`
   */
  static layerFor(values: { databaseUrl: string; publicUrl?: string }) {
    return Layer.succeed(
      AppConfig,
      AppConfig.of({
        databaseUrl: Redacted.make(values.databaseUrl),
        publicUrl: new URL(values.publicUrl ?? 'http://localhost'),
      }),
    )
  }
}
