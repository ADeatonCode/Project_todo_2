/*
 * Admin page for staff only.
 * Here a head admin can manage users, bans, roles, and groups.
 * Regular signed-in people never see this screen (AdminRoute blocks them).
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
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
  createAdminUser,
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

/** True when this user is the single top "head" admin. */
function isHeadAccount(user) {
  return isHeadUser(user);
}

/** True when this user is staff (admin or head). */
function isStaffAccount(user) {
  return user?.role === 'admin' || isHeadAccount(user);
}

/** Chip label + color for a user's role. */
function roleBadge(user) {
  if (isHeadAccount(user)) {
    return { label: 'Head admin', color: 'secondary' };
  }
  if (user?.role === 'admin') {
    return { label: 'Admin', color: 'primary' };
  }
  return { label: 'User', color: 'default' };
}

/** Sorted list of group names this user belongs to. */
function userGroupNames(user) {
  return (user?.groups || [])
    .map((group) => (typeof group === 'string' ? group : group?.name || ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Best short name to show for a user in the table. */
function userHandle(user) {
  return user?.username || user?.email || user?.name || 'Unknown';
}

/** Lowercase name used when sorting the user list. */
function userSortName(user) {
  return String(user?.name || userHandle(user) || '').toLowerCase();
}

/** Sort order: head first, then by group, then staff, then name. */
function compareAdminUsers(a, b) {
  const aHead = isHeadAccount(a);
  const bHead = isHeadAccount(b);
  if (aHead !== bHead) return aHead ? -1 : 1;

  const aKey = userGroupNames(a)[0] || '';
  const bKey = userGroupNames(b)[0] || '';
  const aUngrouped = !aKey;
  const bUngrouped = !bKey;
  if (aUngrouped !== bUngrouped) return aUngrouped ? 1 : -1;

  const groupCmp = aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
  if (groupCmp) return groupCmp;

  const aStaff = isStaffAccount(a);
  const bStaff = isStaffAccount(b);
  if (aStaff !== bStaff) return aStaff ? -1 : 1;

  const nameCmp = userSortName(a).localeCompare(userSortName(b), undefined, { sensitivity: 'base' });
  if (nameCmp) return nameCmp;
  return String(userHandle(a)).localeCompare(String(userHandle(b)), undefined, { sensitivity: 'base' });
}

/** Return a new array of users in admin-table order. */
function sortAdminUsers(users) {
  return [...users].sort(compareAdminUsers);
}

/** Merge a user update but keep older group info if the server omitted it. */
function keepUserGroups(previous, updated) {
  return { ...previous, ...updated, groups: updated.groups || previous.groups || [] };
}

/** Pick a friendly error message from a failed API call. */
function apiErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

/** Staff control panel for users and groups. */
export default function Admin() {
  const [currentUser, setCurrentUser] = useState(readTodoUser);
  const viewerIsHead = isHeadUser(currentUser);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '' });
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberUsernames, setMemberUsernames] = useState({});
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
      setUsers(sortAdminUsers(Array.isArray(usersData) ? usersData : []));
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
        ? `Ban ${userHandle(user)}? They will not be able to log in.`
        : `Unban ${userHandle(user)}?`
    );
    if (!confirmed) return;
    try {
      const updated = await setUserBanned(user._id, nextBanned);
      setUsers((prev) => sortAdminUsers(prev.map((u) => (u._id === updated._id ? keepUserGroups(u, updated) : u))));
      flash(updated.banned ? `Banned ${userHandle(updated)}` : `Unbanned ${userHandle(updated)}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not update ban'), 'error');
    }
  };

  const handleReset = async (user) => {
    if (String(user._id) === String(currentUser?._id) || isHeadAccount(user)) {
      flash('You cannot reset this account', 'error');
      return;
    }
    if (!window.confirm(`Delete all tasks owned by ${userHandle(user)}?`)) return;
    try {
      const result = await resetUserTasks(user._id);
      flash(`Reset tasks for ${userHandle(user)} (${result.deletedCount || 0} deleted)`);
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
        sortAdminUsers(
          prev.map((u) => {
            if (former && u._id === former._id) return keepUserGroups(u, former);
            if (newHead && u._id === newHead._id) return keepUserGroups(u, newHead);
            if (u.role === 'head' && u._id !== newHead?._id) return { ...u, role: 'admin' };
            return u;
          })
        )
      );
      writeTodoUser({ role: 'admin' });
      setCurrentUser(readTodoUser());
      flash(`${userHandle(newHead)} is now the head admin. You remain an admin.`);
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
        ? `Make ${userHandle(user)} an admin?`
        : `Remove admin from ${userHandle(user)}?`
    );
    if (!confirmed) return;
    try {
      const updated = await setUserRole(user._id, role);
      setUsers((prev) => sortAdminUsers(prev.map((u) => (u._id === updated._id ? keepUserGroups(u, updated) : u))));
      flash(role === 'admin' ? `${userHandle(updated)} is now an admin` : `${userHandle(updated)} is now a user`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not update role'), 'error');
    }
  };

  const handleRemove = async (user) => {
    if (String(user._id) === String(currentUser?._id) || isHeadAccount(user)) {
      flash('You cannot remove this account', 'error');
      return;
    }
    if (!window.confirm(`Remove ${userHandle(user)} and delete their tasks?`)) return;
    try {
      await removeAdminUser(user._id);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      flash(`Removed ${userHandle(user)}`);
      const groupsData = await getGroups();
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not remove user'), 'error');
    }
  };

  const handleCreateUser = async () => {
    const name = newUser.name.trim();
    const username = newUser.username.trim();
    const password = newUser.password;
    if (!name || !username || !password) {
      flash('Enter a name, username, and password', 'error');
      return;
    }
    const role = viewerIsHead && makeAdmin ? 'admin' : 'user';
    try {
      await createAdminUser(name, username, password, role);
      setNewUser({ name: '', username: '', password: '' });
      setMakeAdmin(false);
      const usersData = await getAdminUsers();
      setUsers(sortAdminUsers(Array.isArray(usersData) ? usersData : []));
      flash(`Added ${username}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not add user'), 'error');
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
      const usersData = await getAdminUsers();
      setUsers(sortAdminUsers(Array.isArray(usersData) ? usersData : []));
      flash(`Created group ${group.name}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not create group'), 'error');
    }
  };

  const handleAddMember = async (groupId) => {
    const username = (memberUsernames[groupId] || '').trim();
    if (!username) {
      flash('Enter a member username', 'error');
      return;
    }
    try {
      const updated = await addGroupMember(groupId, username);
      setGroups((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      setMemberUsernames((prev) => ({ ...prev, [groupId]: '' }));
      const usersData = await getAdminUsers();
      setUsers(sortAdminUsers(Array.isArray(usersData) ? usersData : []));
      flash(`Added ${username}`);
    } catch (error) {
      flash(apiErrorMessage(error, 'Could not add member'), 'error');
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete group ${group.name}?`)) return;
    try {
      await deleteGroup(group._id);
      setGroups((prev) => prev.filter((g) => g._id !== group._id));
      const usersData = await getAdminUsers();
      setUsers(sortAdminUsers(Array.isArray(usersData) ? usersData : []));
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
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>Status</TableCell>
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
                      <TableCell>{userHandle(user)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={badge.label} color={badge.color} />
                      </TableCell>
                      <TableCell>
                        {userGroupNames(user).join(', ') || '—'}
                      </TableCell>
                      <TableCell sx={targetIsHead ? { opacity: 0.45 } : undefined}>
                        {targetIsHead ? (
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.disabled"
                            sx={{ textDecoration: 'line-through', fontStyle: 'italic' }}
                          >
                            —
                          </Typography>
                        ) : user.banned ? (
                          <Chip size="small" label="Banned" color="error" />
                        ) : (
                          <Chip size="small" label="Active" color="success" />
                        )}
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

      <Card title="Add user">
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            label="Name"
            value={newUser.name}
            onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            size="small"
            label="Username"
            value={newUser.username}
            onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
          />
          <TextField
            size="small"
            type="password"
            label="Password"
            value={newUser.password}
            onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
          />
          {viewerIsHead && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={makeAdmin}
                  onChange={(e) => setMakeAdmin(e.target.checked)}
                />
              }
              label="Make admin"
            />
          )}
          <Button variant="contained" onClick={handleCreateUser}>
            Add user
          </Button>
        </Box>
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
                  .map((m) => (typeof m === 'object' ? `${m.name} (${userHandle(m)})` : m))
                  .join(', ') || 'none'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="Add member by username"
                  value={memberUsernames[group._id] || ''}
                  onChange={(e) =>
                    setMemberUsernames((prev) => ({ ...prev, [group._id]: e.target.value }))
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
