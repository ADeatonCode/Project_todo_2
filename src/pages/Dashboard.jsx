import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Alert, Grid, Typography } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import Card from '../components/Card';
import { getTodos } from '../utils/api';
import { isAdminUser, readTodoUser } from '../ProtectedRoute';

const MotionGridItem = motion(Grid);

const PIE_COLORS = {
  Completed: '#4caf50',
  Open: '#2196f3',
  'High priority': '#ff9800',
};

const KPI_MIN_HEIGHT = 148;
const KPI_SIZE = { xs: 12, md: 4 };
const KPI_NUMBER_SX = {
  variant: 'h4',
  component: 'p',
  sx: { fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap' },
};

function uniqueProjectCount(todos) {
  const keys = new Set();
  for (const todo of todos) {
    const name = typeof todo.project === 'string' ? todo.project.trim() : '';
    if (name) keys.add(name.toLowerCase());
  }
  return keys.size;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weeklyActivityFromCreatedAt(todos) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const start = startOfWeekMonday(new Date());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  for (const todo of todos) {
    if (!todo.createdAt) continue;
    const created = new Date(todo.createdAt);
    if (Number.isNaN(created.getTime()) || created < start || created >= end) continue;
    const jsDay = created.getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    counts[idx] += 1;
  }

  return days.map((day, i) => ({ day, tasks: counts[i] }));
}

export default function Dashboard() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const admin = isAdminUser(readTodoUser());

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTodos();
        setTodos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching dashboard todos:', error);
        setTodos([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalTasks = todos.length;
  const activeProjects = uniqueProjectCount(todos);
  const completedCount = todos.filter((t) => t.completed).length;
  const priorityCount = todos.filter((t) => t.priority).length;
  const priorityOpenCount = todos.filter((t) => t.priority && !t.completed).length;
  const openOtherCount = todos.filter((t) => !t.completed && !t.priority).length;

  const pieData = [
    { name: 'Completed', value: completedCount },
    { name: 'Open', value: openOtherCount },
    { name: 'High priority', value: priorityOpenCount },
  ].filter((slice) => slice.value > 0);

  const hasTimestamps = todos.some((t) => t.createdAt);
  const weeklyData = hasTimestamps
    ? weeklyActivityFromCreatedAt(todos)
    : [
        { day: 'Completed', tasks: completedCount },
        { day: 'Open', tasks: totalTasks - completedCount },
        { day: 'Priority', tasks: priorityCount },
      ];

  return (
    <Grid container spacing={2}>
      {admin && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            Admin view: these stats include every user&apos;s tasks (including unscoped older tasks with no owner).
          </Alert>
        </Grid>
      )}
      <MotionGridItem
        size={KPI_SIZE}
        sx={{ display: 'flex' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <Card title="Total Tasks" minHeight={KPI_MIN_HEIGHT}>
          <Typography {...KPI_NUMBER_SX}>{loading ? '—' : totalTasks}</Typography>
        </Card>
      </MotionGridItem>

      <MotionGridItem
        size={KPI_SIZE}
        sx={{ display: 'flex' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <Card title="Active Projects" minHeight={KPI_MIN_HEIGHT}>
          <Typography {...KPI_NUMBER_SX}>{loading ? '—' : activeProjects}</Typography>
        </Card>
      </MotionGridItem>

      <MotionGridItem
        size={KPI_SIZE}
        sx={{ display: 'flex' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
      >
        <Card title="Priority" minHeight={KPI_MIN_HEIGHT}>
          <Typography {...KPI_NUMBER_SX}>{loading ? '—' : priorityCount}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {loading ? '—' : `${priorityOpenCount} open`}
          </Typography>
        </Card>
      </MotionGridItem>

      <MotionGridItem
        size={{ xs: 12 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 200 }}
      >
        <Card title="Task Completion">
          {loading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : pieData.length === 0 ? (
            <Typography color="text.secondary">No tasks yet.</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={80}
                  label
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#9e9e9e'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </MotionGridItem>

      <MotionGridItem
        size={{ xs: 12 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
      >
        <Card title={hasTimestamps ? 'Weekly Activity' : 'Task Breakdown'}>
          {loading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : hasTimestamps ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="tasks" stroke="#3f51b5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#3f51b5" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </MotionGridItem>
    </Grid>
  );
}
