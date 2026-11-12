// The shared code imports two web modules that use Vite's import.meta.env:
// ../../src/data/files.ts and ../../src/store/host.ts. Metro swaps in the
// app's own copies (src/shims/), but TypeScript still reads the web copies.
interface ImportMeta {
  readonly env: { readonly BASE_URL: string }
}
