import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'tesseract.js', 'xlsx', 'papaparse'],
    exclude: ['pdfjs-dist/build/pdf.worker.min']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs': ['pdfjs-dist'],
          'ocr': ['tesseract.js'],
          'excel': ['xlsx'],
          'csv': ['papaparse']
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'pdf.worker.min.js') {
            return 'assets/pdf.worker.min.js';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
}));
