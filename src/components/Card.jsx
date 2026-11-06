/*
 * Simple card box used on the dashboard.
 * It shows a title and whatever content you put inside.
 */
import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

/** A titled box that wraps dashboard content. */
export default function Card({ title, children, minHeight }) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 2,
        minHeight,
        height: minHeight ? '100%' : undefined,
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {children}
      </Box>
    </Paper>
  );
}