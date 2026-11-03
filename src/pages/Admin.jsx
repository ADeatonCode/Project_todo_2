import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Card from '../components/Card';
import { isHeadUser, readTodoUser, writeTodoUser } from '../ProtectedRoute';
import {
  addGroupMember,
  createGroup,
  deleteGroup,
  getAdminUsers,
  getGroups,
  makeHead,
  removeAdminUser,
  resetUserTasks,
  setUserBanned,
  setUserRole,
} from '../utils/api';

function isHeadAccount(user) {
  return isHeadUser(user);
}

function isStaffAccount(user) {
  return user?.role === 'admin' || isHeadAccount(user);
}

function roleBadge(user) {
  if (isHeadAccount(user)) {
    return { label: 'Head admin', color: 'secondary' };
  }
  if (user?.role === 'admin') {
    return { label: 'Admin', color: 'primary' };
  }
  return { label: 'User', color: 'default' };
}

function apiErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(readTodoUser);
  const viewerIsHead = isHeadUser(currentUser);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [memberEmails, setMemberEmails] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loading, setLoading] = useState(true);

  const flash = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
  };

  const load = async () => {
    try {
      const [usersData, groupsData] = await Promise.all([getAdminUsers(), getGroups()]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not load admin data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleBan = async (user) => {
    if (String(user._id) === String(currentUser?._id) || isHeadAccount(user)) {
      flash('You cannot ban this account', 'error');
      return;
    }
    const nextBanned = !user.banned;
    const confirmed = window.confirm(
      nextBanned
        ? `Ban ${user.email}? They will not be able to log in.`
        : `Unban ${user.email}?`
    );
    if (!confirmed) return;
    try {
      const updated = await setUserBanned(user._id, nextBanned);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
      flash(updated.banned ? `Banned ${updated.email}` : `Unbanned ${updated.email}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not update ban'), 'error');
    }
  };

  const handleReset = async (user) => {
    if (String(user._id) === String(currentUser?._id) || isHeadAccount(user)) {
      flash('You cannot reset this account', 'error');
      return;
    }
    if (!window.confirm(`Delete all tasks owned by ${user.email}?`)) return;
    try {
      const result = await resetUserTasks(user._id);
      flash(`Reset tasks for ${user.email} (${result.deletedCount || 0} deleted)`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not reset tasks'), 'error');
    }
  };

  const handleMakeHead = async (user) => {
    if (!viewerIsHead || isHeadAccount(user) || String(user._id) === String(currentUser?._id)) {
      flash('Only the current head admin can transfer the god key', 'error');
      return;
    }
    if (user.banned) {
      flash('Cannot transfer head to a banned user', 'error');
      return;
    }
    if (!window.confirm('They will have the god key. You will remain an admin.')) return;
    try {
      const result = await makeHead(user._id);
      const newHead = result.head || result;
      const former = result.formerHead;
      setUsers((prev) =>
        prev.map((u) => {
          if (former && u._id === former._id) return { ...u, ...former };
          if (newHead && u._id === newHead._id) return { ...u, ...newHead };
          if (u.role === 'head' && u._id !== newHead?._id) return { ...u, role: 'admin' };
          return u;
        })
      );
      writeTodoUser({ role: 'admin' });
      setCurrentUser(readTodoUser());
      flash(`${newHead.email} is now the head admin. You remain an admin.`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not transfer head'), 'error');
    }
  };

  const handleRole = async (user, role) => {
    if (!viewerIsHead || isHeadAccount(user) || String(user._id) === String(currentUser?._id)) {
      flash('Only the head admin can change other users\' roles', 'error');
      return;
    }
    const confirmed = window.confirm(
      role === 'admin'
        ? `Make ${user.email} an admin?`
        : `Remove admin from ${user.email}?`
    );
    if (!confirmed) return;
    try {
      const updated = await setUserRole(user._id, role);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
      flash(role === 'admin' ? `${updated.email} is now an admin` : `${updated.email} is now a user`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not update role'), 'error');
    }
  };

  const handleRemove = async (user) => {
    if (String(user._id) === String(currentUser?._id) || isHeadAccount(user)) {
      flash('You cannot remove this account', 'error');
      return;
    }
    if (!window.confirm(`Remove ${user.email} and delete their tasks?`)) return;
    try {
      await removeAdminUser(user._id);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      flash(`Removed ${user.email}`);
      const groupsData = await getGroups();
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not remove user'), 'error');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      flash('Enter a group name', 'error');
      return;
    }
    try {
      const group = await createGroup(groupName.trim());
      setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupName('');
      flash(`Created group ${group.name}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not create group'), 'error');
    }
  };

  const handleAddMember = async (groupId) => {
    const email = (memberEmails[groupId] || '').trim();
    if (!email) {
      flash('Enter a member email', 'error');
      return;
    }
    try {
      const updated = await addGroupMember(groupId, email);
      setGroups((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      setMemberEmails((prev) => ({ ...prev, [groupId]: '' }));
      flash(`Added ${email}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not add member'), 'error');
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete group ${group.name}?`)) return;
    try {
      await deleteGroup(group._id);
      setGroups((prev) => prev.filter((g) => g._id !== group._id));
      flash(`Deleted group ${group.name}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not delete group'), 'error');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5">Admin</Typography>
      {message && <Alert severity={messageType}>{message}</Alert>}

      <Card title="Users">
        {loading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Banned</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const isSelf = String(user._id) === String(currentUser?._id);
                  const targetIsHead = isHeadAccount(user);
                  const canModerate = !isSelf && !targetIsHead && (viewerIsHead || !isStaffAccount(user));
                  const canChangeRole = viewerIsHead && !isSelf && !targetIsHead;
                  const badge = roleBadge(user);
                  return (
                    <TableRow key={user._id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip size="small" label={badge.label} color={badge.color} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.banned ? 'banned' : 'active'}
                          color={user.banned ? 'error' : 'success'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {viewerIsHead && !isSelf && !targetIsHead && !user.banned && (
                          <Button size="small" onClick={() => handleMakeHead(user)}>
                            Make head admin
                          </Button>
                        )}
                        {canChangeRole && user.role !== 'admin' && (
                          <Button size="small" onClick={() => handleRole(user, 'admin')}>
                            Make admin
                          </Button>
                        )}
                        {canChangeRole && user.role === 'admin' && (
                          <Button size="small" onClick={() => handleRole(user, 'user')}>
                            Remove admin
                          </Button>
                        )}
                        {canModerate && (
                          <>
                            <Button size="small" onClick={() => handleBan(user)}>
                              {user.banned ? 'Unban' : 'Ban'}
                            </Button>
                            <Button size="small" onClick={() => handleReset(user)}>
                              Reset
                            </Button>
                            <Button size="small" color="error" onClick={() => handleRemove(user)}>
                              Remove
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Card>

      <Card title="Groups">
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Button variant="contained" onClick={handleCreateGroup}>
            Create group
          </Button>
        </Box>
        {groups.length === 0 ? (
          <Typography color="text.secondary">No groups yet.</Typography>
        ) : (
          groups.map((group) => (
            <Paper key={group._id} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1">{group.name}</Typography>
                <Button size="small" color="error" onClick={() => handleDeleteGroup(group)}>
                  Delete
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Members:{' '}
                {(group.members || [])
                  .map((m) => (typeof m === 'object' ? `${m.name} (${m.email})` : m))
                  .join(', ') || 'none'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="Add member by email"
                  value={memberEmails[group._id] || ''}
                  onChange={(e) =>
                    setMemberEmails((prev) => ({ ...prev, [group._id]: e.target.value }))
                  }
                />
                <Button variant="outlined" onClick={() => handleAddMember(group._id)}>
                  Add member
                </Button>
              </Box>
            </Paper>
          ))
        )}
      </Card>
    </Box>
  );
}
