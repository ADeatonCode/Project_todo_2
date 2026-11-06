/*
 * Entry point for the React website.
 * It picks the theme colors, turns on the router, and draws the App.
 * basename "/projects/todo" means the site lives in that folder on the web host.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const theme = createTheme({ palette: { mode: 'light' } });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename="/projects/todo">
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);