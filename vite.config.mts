import { defineConfig, Plugin, ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react'
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BUILD_ASSETS_PLACEHOLDER = 'const BUILD_ASSETS = [];'

/**
 * Fills in the built serviceWorker.js's BUILD_ASSETS with every hashed file the build emits (JS,
 * CSS and worker scripts), for it to precache on install - so the app works offline even if it's
 * never been loaded while the service worker was in control. Inlined rather than written to a
 * separate manifest so serviceWorker.js changes on every deploy, which is what makes browsers
 * install the new worker (and so precache the new build) at all. Vite's own `build.manifest`
 * isn't enough anyway - it leaves out the `new Worker(new URL(...))` worker scripts.
 */
function precacheBuildAssets(): Plugin {
    let config: ResolvedConfig
    let assets: string[] = []
    return {
        name: 'precache-build-assets',
        apply: 'build',
        configResolved(resolved) {
            config = resolved
        },
        generateBundle(_, bundle) {
            assets = Object.keys(bundle).filter(f => f.startsWith('assets/')).map(f => `/${f}`).sort()
        },
        async closeBundle() {
            const swPath = join(config.root, config.build.outDir, 'serviceWorker.js')
            const sw = await readFile(swPath, 'utf8')
            if (!sw.includes(BUILD_ASSETS_PLACEHOLDER)) {
                throw new Error(`precache-build-assets: "${BUILD_ASSETS_PLACEHOLDER}" not found in ${swPath}`)
            }
            await writeFile(swPath, sw.replace(BUILD_ASSETS_PLACEHOLDER, `const BUILD_ASSETS = ${JSON.stringify(assets)};`))
        },
    }
}

export default defineConfig({
    plugins: [
        react({

        }),
        precacheBuildAssets(),
    ],
    server: {
        watch: {
            ignored: ['**/out/**']
        }
    }
});
