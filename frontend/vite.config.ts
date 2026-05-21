import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version?: string };

const buildDate = new Date();
const buildIso = buildDate.toISOString();
const buildStamp = buildIso.replace(/[-:.TZ]/g, '').slice(0, 12);
const appVersion = process.env.VITE_APP_VERSION?.trim() || `${packageJson.version ?? '0.0.0'}-${buildStamp}`;

const normalizeCommit = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 7) : null;
};

const resolveAppCommit = (): string => {
  const envCommit = normalizeCommit(process.env.VITE_APP_COMMIT)
    ?? normalizeCommit(process.env.RENDER_GIT_COMMIT)
    ?? normalizeCommit(process.env.GIT_COMMIT)
    ?? normalizeCommit(process.env.COMMIT_SHA);

  if (envCommit) return envCommit;

  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return 'local';
  }
};

const appCommit = resolveAppCommit();

function appVersionManifestPlugin(): Plugin {
  return {
    name: 'blister-app-version-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ version: appVersion, commit: appCommit, builtAt: buildIso }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
  },
  plugins: [
    react(),
    appVersionManifestPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'icons.svg'],
      manifest: {
        id: '/',
        name: 'Blíster — Gestión de Botiquín',
        short_name: 'Blíster',
        description: 'Gestión inteligente de tu botiquín personal y familiar.',
        theme_color: '#0b8178',
        background_color: '#f5f5f5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://cima.aemps.es' && url.pathname.includes('/imgsmed/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'aemps-images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://cima.aemps.es' && !url.pathname.includes('/imgsmed/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'aemps-data-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      zod: path.resolve(__dirname, './node_modules/zod')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/scss/shared" as *;`
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
