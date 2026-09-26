import { Router, type RequestHandler } from "express";

function wrap(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    try {
      const result = handler(req, res, next) as unknown;
      if (result && typeof result === "object" && "then" in result) {
        (result as Promise<unknown>).catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

export function createRouter() {
  const router = Router();
  const methods = ["get", "post", "put", "patch", "delete"] as const;

  for (const method of methods) {
    const original = router[method].bind(router);
    (router[method] as unknown as (path: string, ...handlers: RequestHandler[]) => void) = (
      path: string,
      ...handlers: RequestHandler[]
    ) => original(path, ...handlers.map(wrap));
  }

  return router;
}
