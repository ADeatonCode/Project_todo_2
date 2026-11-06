/*
 * Tiny helpers that guard pages.
 * They read who is logged in from browser storage.
 * ProtectedRoute sends guests to login; AdminRoute allows staff only.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';

/** Read the saved user from browser storage (or null if logged out). */
export function readTodoUser() {
  try {
    const raw = localStorage.getItem('todoUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Update the saved user and tell other parts of the page that it changed. */
export function writeTodoUser(updates) {
  const current = readTodoUser() || {};
  const next = { ...current, ...updates };
  localStorage.setItem('todoUser', JSON.stringify(next));
  window.dispatchEvent(new Event('todoUserUpdated'));
  return next;
}

/** True when this person is the top boss role (head). */
export function isHeadUser(user = readTodoUser()) {
  return user?.role === 'head';
}

/** True when this person is staff (admin or head). */
export function isAdminUser(user = readTodoUser()) {
  return user?.role === 'admin' || user?.role === 'head' || isHeadUser(user);
}

/** Only show the page if someone is logged in; otherwise go to /auth. */
export default function ProtectedRoute({ children }) {
  if (!readTodoUser()) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

/** Only show the page for staff; everyone else goes home. */
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
