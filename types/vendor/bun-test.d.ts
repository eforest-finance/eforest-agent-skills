declare module "bun:test" {
  export function test(
    label: string,
    fn: (done: (err?: unknown) => void) => void | Promise<unknown>,
  ): void;
  export function test(
    label: string,
    options: { timeout?: number },
    fn: (done: (err?: unknown) => void) => void | Promise<unknown>,
  ): void;
}
