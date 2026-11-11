import { Document } from './document.tsx'

/**
 * A placeholder until the design system step. It deliberately uses only daisyUI's defaults,
 * so no design decisions are made here.
 */
export function HomePage() {
  return () => (
    <Document>
      <main class="mx-auto max-w-xl px-4 py-12">
        <h1 class="text-2xl font-semibold">Crossline</h1>
        <p class="text-base-content/70 mt-2">The foundation is running. Pages come with the design system.</p>
        <p class="mt-4">
          <a class="link" href="/health">
            Health check
          </a>
        </p>
      </main>
    </Document>
  )
}
