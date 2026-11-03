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

export function writeTodoUser(updates) {
  const current = readTodoUser() || {};
  const next = { ...current, ...updates };
  localStorage.setItem('todoUser', JSON.stringify(next));
  window.dispatchEvent(new Event('todoUserUpdated'));
  return next;
}

export function isHeadUser(user = readTodoUser()) {
  return user?.role === 'head';
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
