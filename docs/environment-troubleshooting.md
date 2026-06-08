# ConstructionOS: Environment & Node.js Troubleshooting

This document lists known runtime warnings, performance considerations, and how to address them in different environments.

---

## 1. Node.js Deprecation Warning (`module.register()`)

### Warning Message
```text
(node:xxxx) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
```

### Context
This warning occurs on newer Node.js versions (v22+) when running Next.js CLI commands (such as `next dev`). Next.js internally uses Node's module register APIs for importing and compiling TypeScript configuration files on the fly. 

### Mitigation
* **Action:** No user action is required. This is an internal Next.js library deprecation that will be resolved in upcoming Next.js minor releases. It does not affect application behavior or safety.

---

## 2. ES Module Warning on Tailwind Config (`MODULE_TYPELESS_PACKAGE_JSON`)

### Warning Message
```text
(node:xxxx) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/hrush/Downloads/Construction/tailwind.config.ts?id=xxxxxxxxxxxxx is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to package.json.
```

### Context
Since `tailwind.config.ts` uses modern ES module imports (`import type { Config } from "tailwindcss"`), Node.js has to load it as an ES module. Because our `package.json` does not specify `"type": "module"`, Node attempts to parse it as CommonJS first, fails, and falls back to reparsing it as an ES module. This causes a minor performance overhead during server startup.

### Resolution Options

#### Option A: Set `"type": "module"` in `package.json` (Recommended)
1. Add `"type": "module"` to `package.json`.
2. **Implication:** All Node scripts (e.g. `bootstrap.js`) must use ES import/export syntax OR be renamed with a `.cjs` extension (e.g. `bootstrap.cjs`) to run as CommonJS.

#### Option B: Ignore the warning
The warning causes a tiny startup performance overhead but does not impact application execution.
