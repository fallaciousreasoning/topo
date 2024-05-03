import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import tailwindcss from 'tailwindcss';

const production = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    svelte({
        compilerOptions: {
            // enable run-time checks when not in production
            dev: !production,
        },
        preprocess: sveltePreprocess({
            postcss: {
                plugins: [
                    tailwindcss('./tailwind.config.js')
                ]
            }
        }),
    }),
  ]
});
