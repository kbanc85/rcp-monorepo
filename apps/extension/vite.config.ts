import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import path from 'path'

// Update the manifest to point to source files
const updatedManifest = {
  ...manifest,
  background: {
    service_worker: 'src/background.ts',
    type: 'module'
  },
  action: {
    ...manifest.action,
    default_icon: {
      '16': 'src/assets/icon16.png',
      '48': 'src/assets/icon48.png',
      '128': 'src/assets/icon128.png'
    }
  },
  side_panel: {
    default_path: 'src/sidepanel.html'
  },
  permissions: [
    ...manifest.permissions,
    'sidePanel'
  ],
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/floatingIcon.ts'],
      run_at: 'document_end'
    }
  ],
  icons: {
    '16': 'src/assets/icon16.png',
    '48': 'src/assets/icon48.png',
    '128': 'src/assets/icon128.png'
  }
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: updatedManifest })
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Make sure SVG files are properly handled
          if (assetInfo.name && (assetInfo.name as string).endsWith('.svg')) {
            return 'assets/[name].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      './assets': '/src/assets'
    }
  }
})
