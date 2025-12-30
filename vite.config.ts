// import path from 'path';
// import { defineConfig, loadEnv } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig(({ mode }) => {
//     const env = loadEnv(mode, '.', '');
//     return {
//       // Make asset paths relative so `dist/index.html` works with file://
//       base: './',
//       server: {
//         port: 3000,
//         host: '0.0.0.0',
//       },
//       plugins: [react()],
//       define: {
//         'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
//         'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
//       },
//       resolve: {
//         alias: {
//           '@': path.resolve(__dirname, '.'),
//         }
//       }
//     };
// });



import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // علشان يشتغل كويس مع Electron و file://
    base: './',

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [
      react()
    ],

    // مهم جدًا للتوافق مع متصفحات أقدم
    build: {
      target: 'es2015',
      outDir: 'dist',
      sourcemap: false,
    },

    // تعريف المتغيرات البيئية
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    // تحسين الاعتمادية في بعض البيئات
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2015',
      },
    },
  };
});
