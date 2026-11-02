import React from 'react';
import Card from '../components/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const activity = [
  { day: 'Mon', tasks: 5 },
  { day: 'Tue', tasks: 8 },
  { day: 'Wed', tasks: 6 },
  { day: 'Thu', tasks: 10 },
  { day: 'Fri', tasks: 7 },
];

export default function Analytics() {
  return (
    <Card title="Weekly Activity">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={activity}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="tasks" stroke="#3f51b5" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}