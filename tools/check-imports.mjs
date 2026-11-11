/* Static sanity check: finds JSX components and hook calls that are used but
   never imported/declared.

   Why this exists: a single missing import (e.g. `useMemo` in the live exam
   screen) is invisible to Vite's build — the bundler happily emits code that
   throws at runtime, and because React unmounts the tree on a render error the
   user sees a completely blank page. This check catches that class of bug.

   node tools/check-imports.mjs */
import fs from 'node:fs'
import path from 'node:path'

const files = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(target)
    else if (/\.(jsx?|mjs)$/.test(entry.name)) files.push(target)
  }
}
walk('src')

const GLOBALS = new Set([
  'React', 'window', 'document', 'console', 'Math', 'JSON', 'Date', 'Object', 'Array', 'String',
  'Number', 'Boolean', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Intl', 'Error', 'TypeError',
  'RangeError', 'RegExp', 'Symbol', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'NaN', 'Infinity',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'setTimeout', 'clearTimeout', 'setInterval',
  'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'structuredClone',
  'fetch', 'alert', 'navigator', 'location', 'localStorage', 'sessionStorage', 'globalThis',
  'undefined', 'arguments', 'URL', 'URLSearchParams', 'AbortController', 'FormData', 'Blob', 'File',
  'FileReader', 'Image', 'Audio', 'performance', 'crypto', 'btoa', 'atob', 'BigInt', 'Function',
  'Reflect', 'Proxy', 'history', 'matchMedia', 'MediaRecorder', 'Notification', 'TextEncoder',
  'TextDecoder', 'WebSocket', 'process', 'module', 'exports', 'require', '__dirname', 'Element',
])

const HOOKS = [
  'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext', 'useReducer',
  'useLayoutEffect', 'useId', 'useTransition', 'useDeferredValue', 'useSyncExternalStore',
  'useImperativeHandle', 'useDebugValue',
]

/** Removes block and line comments only — string literals are left alone so a
 *  quote inside JSX text cannot swallow the rest of the file. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => {
      let out = ''
      let quote = null
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index]
        if (quote) {
          out += char
          if (char === quote && line[index - 1] !== '\\') quote = null
          continue
        }
        if (char === "'" || char === '"' || char === '`') {
          quote = char
          out += char
          continue
        }
        if (char === '/' && line[index + 1] === '/') break
        out += char
      }
      return out
    })
    .join('\n')
}

const problems = []

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const source = stripComments(raw)
  const declared = new Set()

  /* imports: captured from the raw source, where specifiers still exist */
  /* Side-effect imports (`import './x.css'`) have no bindings and must not be
     allowed to swallow the next import statement. */
  for (const match of raw.matchAll(/import\s+(?!['"])([\s\S]*?)\s+from\s+['"][^'"]*['"]/g)) {
    for (const part of match[1].replace(/[{}]/g, ',').split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim()
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name)
    }
  }
  /* named declarations */
  for (const match of source.matchAll(/(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) {
    declared.add(match[1])
  }
  /* destructuring, including renames: { icon: Icon } and [a, b] */
  for (const match of source.matchAll(/(?:const|let|var|\()\s*\{([^{}]*)\}\s*(?:=|=>|\))/g)) {
    for (const part of match[1].split(',')) {
      const renamed = part.split('=')[0].split(':').pop().trim()
      if (/^[A-Za-z_$][\w$]*$/.test(renamed)) declared.add(renamed)
      const original = part.split(':')[0].split('=')[0].trim()
      if (/^[A-Za-z_$][\w$]*$/.test(original)) declared.add(original)
    }
  }
  for (const match of source.matchAll(/(?:const|let|var)\s*\[([^\]]+)\]\s*=/g)) {
    for (const part of match[1].split(',')) declared.add(part.trim().replace(/=.*/, ''))
  }
  for (const match of source.matchAll(/catch\s*\(([^)]+)\)/g)) {
    for (const part of match[1].split(',')) declared.add(part.trim())
  }
  for (const match of source.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) declared.add(match[1])
  for (const match of source.matchAll(/for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) declared.add(match[1])
  for (const match of source.matchAll(/:\s*([A-Za-z_$][\w$]*)\s*[,}=\n)]/g)) declared.add(match[1])

  const used = new Set()
  for (const match of source.matchAll(/<([A-Z][\w$]*)/g)) used.add(match[1])
  for (const hook of HOOKS) {
    if (new RegExp('(^|[^.\\w])' + hook + '[\\s]*[(]').test(source)) used.add(hook)
  }

  const missing = [...used].filter((name) => !declared.has(name) && !GLOBALS.has(name))
  if (missing.length) problems.push({ file, missing })
}

if (problems.length) {
  for (const problem of problems) {
    console.log('x ' + problem.file + '\n    ' + problem.missing.join(', '))
  }
  console.log('\n' + problems.length + ' file(s) reference names that are never declared')
  process.exit(1)
}

console.log('ok: ' + files.length + ' files checked - every JSX component and hook call resolves to a declaration')
