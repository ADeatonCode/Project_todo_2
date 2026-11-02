import React from 'react';
import { motion } from 'motion/react';
import { Grid, Typography } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/Card'; 
const MotionGridItem = motion(Grid);

export default function Dashboard() {
  const data = [
    { name: 'Completed',   value: 75 },
    { name: 'In Progress', value: 15 },
    { name: 'Overdue',     value: 10 },
  ];
  const colors = ['#4caf50', '#2196f3', '#f44336']; 

  return (
    <Grid container spacing={2}>
      <MotionGridItem
        item xs={12} md={4}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <Card title="Task Completion">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={40}
                outerRadius={80}
                label
              >
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={colors[idx]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </MotionGridItem>

      <MotionGridItem
        item xs={12} md={4}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <Card title="Total Tasks">
          <Typography variant="h3">120</Typography>
        </Card>
      </MotionGridItem>

      <MotionGridItem
        item xs={12} md={4}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
      >
        <Card title="Active Projects">
          <Typography variant="h3">8</Typography>
        </Card>
      </MotionGridItem>
    </Grid>
  );
}
