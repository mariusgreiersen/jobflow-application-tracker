import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Clean Architecture dependency rule, enforced by the linter:
 *   presentation (app, features, components, lib) -> core <- infrastructure
 * The core never imports frameworks or outer layers, and presentation reaches
 * infrastructure only through the composition roots.
 */
const FRAMEWORKS = {
  group: [
    "react",
    "react/*",
    "react-dom",
    "react-dom/*",
    "next",
    "next/*",
    "@supabase/*",
    "zod",
    "sonner",
    "recharts",
    "lucide-react",
    "@dnd-kit/*",
    "radix-ui",
  ],
  message: "The core must stay framework-agnostic. Depend on a port instead.",
};
const OUTER_LAYERS = {
  regex: "^@/(infrastructure|features|components|app|lib)(/|$)",
  message: "The core may not depend on outer layers (dependency rule).",
};

const layerBoundaries = [
  {
    files: ["src/core/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            FRAMEWORKS,
            OUTER_LAYERS,
            { regex: "^@/core/application(/|$)", message: "The domain may not depend on the application layer." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/core/application/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [FRAMEWORKS, OUTER_LAYERS] }] },
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^@/(features|components|app|lib)(/|$)",
              message: "Infrastructure implements core ports and must not depend on presentation.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^@/infrastructure/(?!composition/)",
              message: "Presentation reaches infrastructure only through @/infrastructure/composition/*.",
            },
            { group: ["@supabase/*"], message: "Use a use case instead of calling Supabase from the UI." },
          ],
        },
      ],
    },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...layerBoundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated test output:
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
