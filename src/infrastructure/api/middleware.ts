export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Middleware = (next: Fetcher) => Fetcher;

/**
 * `compose(a, b, c)(fetch)` builds `a(b(c(fetch)))`: the first middleware is the
 * outermost one and sees the request first and the response last.
 */
export function compose(...middlewares: Middleware[]): Middleware {
  return (base) => middlewares.reduceRight<Fetcher>((next, middleware) => middleware(next), base);
}
