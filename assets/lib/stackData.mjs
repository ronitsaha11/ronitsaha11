/**
 * The stack, as groups of brand marks.
 *
 * WHAT EARNS A TILE
 *
 * Only a technology that appears in one of the seven repositories
 * listed in the README. A logo wall is the easiest thing on a profile
 * to inflate and the easiest to check, so the rule is: if it is on
 * this grid it is in a repository, and the repository is linked.
 *
 * Things deliberately NOT here, because Simple Icons has no mark for
 * them and inventing one would be worse than listing them as text:
 * Room, WorkManager, Health Connect, deck.gl, tree-sitter, petgraph,
 * Playwright, criterion, PostGIS. They are named in the README's
 * Stack section instead.
 */

export const STACK = [
  {
    label: "LANGUAGES",
    items: [
      ["typescript", "TypeScript"],
      ["python", "Python"],
      ["rust", "Rust"],
      ["kotlin", "Kotlin"],
      ["openjdk", "Java"],
      ["cplusplus", "C++"],
    ],
  },
  {
    label: "FRONTEND",
    items: [
      ["react", "React 19"],
      ["nextdotjs", "Next.js 15"],
      ["tailwindcss", "Tailwind"],
      ["threedotjs", "three.js"],
      ["vite", "Vite"],
    ],
  },
  {
    label: "BACKEND",
    items: [
      ["nodedotjs", "Node.js"],
      ["express", "Express"],
      ["fastapi", "FastAPI"],
      ["sqlalchemy", "SQLAlchemy"],
      ["celery", "Celery"],
    ],
  },
  {
    label: "MOBILE & DESKTOP",
    items: [
      ["android", "Android"],
      ["jetpackcompose", "Compose"],
      ["tauri", "Tauri v2"],
    ],
  },
  {
    label: "DATA & INFRASTRUCTURE",
    items: [
      ["postgresql", "PostgreSQL"],
      ["mongodb", "MongoDB"],
      ["redis", "Redis"],
      ["firebase", "Firebase"],
      ["docker", "Docker"],
      ["githubactions", "Actions"],
      ["vercel", "Vercel"],
    ],
  },
  {
    label: "RUNTIME & TESTING",
    items: [
      ["onnx", "ONNX Runtime"],
      ["vitest", "Vitest"],
      ["pytest", "pytest"],
      ["git", "Git"],
    ],
  },
];

export const ICON_SLUGS = STACK.flatMap((g) => g.items.map(([slug]) => slug));
