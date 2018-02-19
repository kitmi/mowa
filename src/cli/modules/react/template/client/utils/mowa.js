export function normalizePath(p) { return p[0] === '?' ? p : (p[0] === '/' ? p : '/' + p); }

export function appPath(p) { return p ? (window.__basePath + normalizePath(p)) : window.__basePath; }