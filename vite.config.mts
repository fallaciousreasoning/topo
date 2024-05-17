import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import tailwindcss from 'tailwindcss';

const production = process.env.NODE_ENV === 'production';
const ReactCompilerConfig = {
    sources: (filename) => {
        return filename.indexOf('src') !== -1;
    },
};
export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: [
                    ["babel-plugin-react-compiler", ReactCompilerConfig],
                ],
            },
        }),
    ]
});
