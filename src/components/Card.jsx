import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function Card({ title, children }) {
  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box>
        {children}
      </Box>
    </Paper>
  );
}