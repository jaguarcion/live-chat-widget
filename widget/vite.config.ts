import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5174,
    },
    build: {
        lib: {
            entry: 'src/main.ts',
            name: 'LiveChatWidget',
            fileName: () => 'widget.js',
            formats: ['iife'],
        },
        outDir: 'dist',
    },
});
