import { Schema } from 'effect'

/** A record that doesn't exist, or that the viewer isn't allowed to know exists. */
export class NotFound extends Schema.TaggedError<NotFound>()('NotFound', {
  what: Schema.String,
  id: Schema.String,
}) {}

/** Input that fails a rule; `field` names the form field so the page can show it there. */
export class ValidationError extends Schema.TaggedError<ValidationError>()('ValidationError', {
  field: Schema.String,
  message: Schema.String,
}) {}

/**
 * The field changed underneath the person since the form was rendered.
 * `current` is the value now stored, so the page can offer "use mine / use theirs".
 */
export class ConflictError extends Schema.TaggedError<ConflictError>()('ConflictError', {
  field: Schema.String,
  current: Schema.String,
}) {}

/** The database refused or failed a query. `message` is safe to log, not to show. */
export class StoreError extends Schema.TaggedError<StoreError>()('StoreError', {
  message: Schema.String,
}) {}

/** Every failure a controller is expected to handle. Anything else is a bug and answers 500. */
export type AppError = NotFound | ValidationError | ConflictError | StoreError

/**
 * Wraps a thrown database error.
 * @param cause whatever the driver threw
 */
export function storeError(cause: unknown): StoreError {
  return new StoreError({ message: cause instanceof Error ? cause.message : String(cause) })
}
