import { analyzeModule, BaseFileSystemRouter, cleanPath } from "vinxi/fs-router";

export class SolidStartClientFileRouter extends BaseFileSystemRouter {
  toPath(src) {
    const routePath = cleanPath(src, this.config)
      // remove the initial slash
      .slice(1)
      .replace(/index$/, "")
      .replace(/\[([^\/]+)\]/g, (_, m) => {
        if (m.length > 3 && m.startsWith("...")) {
          return `*${m.slice(3)}`;
        }
        if (m.length > 2 && m.startsWith("[") && m.endsWith("]")) {
          return `:${m.slice(1, -1)}?`;
        }
        return `:${m}`;
      });

    return routePath?.length > 0 ? `/${routePath}` : "/";
  }

  toRoute(src) {
    let path = this.toPath(src);

    if (src.endsWith(".md") || src.endsWith(".mdx")) {
      return {
        $component: {
          src: src,
          pick: ["$css"]
        },
        $$route: undefined,
        path,
        filePath: src
      };
    }

    const [_, exports] = analyzeModule(src);
    const hasDefault = exports.find(e => e.n === "default");
    const hasRouteConfig = exports.find(e => e.n === "route");
    if (hasDefault) {
      return {
        $component: {
          src: src,
          pick: ["default", "$css"]
        },
        $$route: hasRouteConfig
          ? {
              src: src,
              pick: ["route"]
            }
          : undefined,
        path,
        filePath: src
      };
    }
  }
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
function createHTTPHandlers(src, exports) {
  const handlers = {};
  for (const exp of exports) {
    if (HTTP_METHODS.includes(exp.n)) {
      handlers[`$${exp.n}`] = {
        src: src,
        pick: [exp.n]
      };
    }
  }
  return handlers;
}

export class SolidStartServerFileRouter extends BaseFileSystemRouter {
  toPath(src) {
    const routePath = cleanPath(src, this.config)
      // remove the initial slash
      .slice(1)
      .replace(/index$/, "")
      .replace(/\[([^\/]+)\]/g, (_, m) => {
        if (m.length > 3 && m.startsWith("...")) {
          return `*${m.slice(3)}`;
        }
        if (m.length > 2 && m.startsWith("[") && m.endsWith("]")) {
          return `:${m.slice(1, -1)}?`;
        }
        return `:${m}`;
      });

    return routePath?.length > 0 ? `/${routePath}` : "/";
  }

  toRoute(src) {
    let path = this.toPath(src);
    if (src.endsWith(".md") || src.endsWith(".mdx")) {
      return {
        $component: {
          src: src,
          pick: ["$css"]
        },
        $$route: undefined,
        path,
        filePath: src
      };
    }

    const [_, exports] = analyzeModule(src);
    const hasRouteConfig = exports.find(e => e.n === "route");
    const hasDefault = exports.find(e => e.n === "default");
    const hasAPIRoutes = exports.find(exp => HTTP_METHODS.includes(exp.n));
    if (hasDefault || hasAPIRoutes) {
      return {
        $component:
          !this.config.dataOnly && hasDefault
            ? {
                src: src,
                pick: ["default", "$css"]
              }
            : undefined,
        $$route: hasRouteConfig
          ? {
              src: src,
              pick: ["route"]
            }
          : undefined,
        ...createHTTPHandlers(src, exports),
        path,
        filePath: src
      };
    }
  }
}
