import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, "dist") + path.sep;
const self = fileURLToPath(import.meta.url);

const safe = (files) => files.filter((f) => !f.startsWith(distDir) && f !== self);

export default {
  "*.{js,jsx,ts,tsx,mjs,cjs,json,md,mdx,yml,yaml,css,scss}": (files) => {
    const f = safe(files);
    return f.length ? `prettier --write ${f.map((f) => JSON.stringify(f)).join(" ")}` : [];
  },
  "*.{js,jsx,ts,tsx,mjs,cjs}": (files) => {
    const f = safe(files);
    return f.length ? `eslint --fix --max-warnings=0 ${f.map((f) => JSON.stringify(f)).join(" ")}` : [];
  },
};
