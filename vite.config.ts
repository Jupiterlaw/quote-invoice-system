import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 項目站址係 /quote-invoice-system/ 子路徑，資產要跟住呢個 base 出
  base: '/quote-invoice-system/',
});
