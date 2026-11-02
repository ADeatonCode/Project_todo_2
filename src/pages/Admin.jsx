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
import { readTodoUser } from '../ProtectedRoute';
import {
  addGroupMember,
  createGroup,
  deleteGroup,
  getAdminUsers,
  getGroups,
  removeAdminUser,
  resetUserTasks,
  setUserBanned,
} from '../utils/api';

function apiErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export default function Admin() {
  const currentUser = readTodoUser();
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
    if (String(user._id) === String(currentUser?._id)) {
      flash('You cannot ban your own account', 'error');
      return;
    }
    try {
      const updated = await setUserBanned(user._id, !user.banned);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
      flash(updated.banned ? `Banned ${updated.email}` : `Unbanned ${updated.email}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not update ban'), 'error');
    }
  };

  const handleReset = async (user) => {
    if (!window.confirm(`Delete all tasks owned by ${user.email}?`)) return;
    try {
      const result = await resetUserTasks(user._id);
      flash(`Reset tasks for ${user.email} (${result.deletedCount || 0} deleted)`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not reset tasks'), 'error');
    }
  };

  const handleRemove = async (user) => {
    if (String(user._id) === String(currentUser?._id)) {
      flash('You cannot remove your own account', 'error');
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
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role || 'user'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={user.banned ? 'banned' : 'active'}
                        color={user.banned ? 'error' : 'success'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => handleBan(user)}>
                        {user.banned ? 'Unban' : 'Ban'}
                      </Button>
                      <Button size="small" onClick={() => handleReset(user)}>
                        Reset
                      </Button>
                      <Button size="small" color="error" onClick={() => handleRemove(user)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
