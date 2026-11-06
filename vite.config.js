/*
 * Vite build settings for Project TODO.
 * base "/projects/todo/" makes asset links work when hosted in that folder.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // InfinityFree subfolder under the lagoon (do not deploy to htdocs root)
  base: '/projects/todo/',
})
