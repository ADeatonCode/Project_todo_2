import React from 'react';
import { Navigate } from 'react-router-dom';

export function readTodoUser() {
  try {
    const raw = localStorage.getItem('todoUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isHeadUser(user = readTodoUser()) {
  if (!user) return false;
  if (user.role === 'head') return true;
  const email = String(user.email || '').toLowerCase().trim();
  return email === 'acdelgato@gmail.com';
}

export function isAdminUser(user = readTodoUser()) {
  return user?.role === 'admin' || user?.role === 'head' || isHeadUser(user);
}

export default function ProtectedRoute({ children }) {
  if (!readTodoUser()) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const user = readTodoUser();
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
