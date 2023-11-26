import { build } from 'esbuild'
import { resolve } from 'path'

const { DEBUG_MODE } = process.env

let debugMode = false
if (DEBUG_MODE && DEBUG_MODE.toLowerCase() === 'true') {
  console.log('Building in DEBUG Mode')
  debugMode = true
}
void build({
  entryPoints: [resolve(__dirname, 'handlers.ts')],
  outdir: 'dist',
  bundle: true,
  loader: { '.ts': 'ts' },
  platform: 'node',
  target: 'es2020',
  minify: !debugMode,
  treeShaking: !debugMode,
  ...(debugMode
    ? /* eslint-disable prettier/prettier */
    {
      sourcemap: 'linked',
      // TODO: source roots would be great if we configured them from the SAM BUILD
    }
    : {}),
  /** eslint-enable prettier/prettier */
})
  .then(() => console.log('⚡ Done'))
  .catch(() => process.exit(1))
