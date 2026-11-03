import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Card from '../components/Card';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Alert from '@mui/material/Alert';
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  restoreTodo,
  getTags,
  createTag,
  getGroups,
  getAssignableUsers,
} from '../utils/api';
import { isAdminUser, readTodoUser } from '../ProtectedRoute';

const UNGROUPED_KEY = '__ungrouped__';
const UNGROUPED_TITLE = 'Ungrouped';

function projectGroupKey(project) {
  const name = typeof project === 'string' ? project.trim() : '';
  return name ? name.toLowerCase() : UNGROUPED_KEY;
}

function projectDisplayName(project) {
  const name = typeof project === 'string' ? project.trim() : '';
  return name || UNGROUPED_TITLE;
}

function ownerLabel(task) {
  const owner = task.userId;
  if (!owner) return 'Unscoped (no owner)';
  if (typeof owner === 'object') {
    const name = owner.name || 'Unknown';
    const email = owner.email || 'no email';
    return `${name} (${email})`;
  }
  return 'Unknown owner';
}

function idOf(value) {
  if (!value) return '';
  return value._id ? String(value._id) : String(value);
}

function taskOwnerId(task) {
  return idOf(task?.userId);
}

function assignedUserIds(task) {
  return (task?.assignedTo || []).map(idOf).filter(Boolean);
}

function userOptionLabel(user) {
  if (!user) return '';
  if (user.name && user.email) return `${user.name} (${user.email})`;
  return user.name || user.email || 'Unknown';
}

function assigneeSummary(task) {
  const people = (task.assignedTo || []).filter((person) => typeof person === 'object');
  if (!people.length) return '';
  return people.map((person) => person.name || person.email).join(', ');
}

function asUserOption(user) {
  if (!user?._id) return null;
  return { _id: user._id, name: user.name, email: user.email };
}

function mergeUserOptions(base, extras) {
  const map = new Map();
  for (const user of [...(base || []), ...(extras || [])]) {
    if (!user || typeof user !== 'object' || !user._id) continue;
    map.set(String(user._id), user);
  }
  return [...map.values()];
}

function groupTasksByProject(tasks) {
  const groups = new Map();
  for (const task of tasks) {
    const key = projectGroupKey(task.project);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        displayName: projectDisplayName(task.project),
        tasks: [],
      });
    }
    groups.get(key).tasks.push(task);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === UNGROUPED_KEY) return 1;
    if (b.key === UNGROUPED_KEY) return -1;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
  });
}

function formatDeletedAt(value) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
}

function taskSecondary(task, admin) {
  const parts = [];
  if (admin) parts.push(ownerLabel(task));
  if (task.groupId?.name) parts.push(admin ? `Group: ${task.groupId.name}` : `Shared with ${task.groupId.name}`);
  const assigned = assigneeSummary(task);
  if (assigned) parts.push(`Assigned: ${assigned}`);
  return parts.join(' · ') || undefined;
}

export default function Tasks() {
  const currentUser = readTodoUser();
  const admin = isAdminUser(currentUser);
  const [tasks, setTasks] = useState([]);
  const [trashTasks, setTrashTasks] = useState([]);
  const [showTrash, setShowTrash] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newProject, setNewProject] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [openTagDialog, setOpenTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#2196f3');
  const [editOpen, setEditOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [editAssignees, setEditAssignees] = useState([]);
  const [editGroupId, setEditGroupId] = useState('');
  const [editPriority, setEditPriority] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [subtaskForms, setSubtaskForms] = useState({});
  const [newSubtasks, setNewSubtasks] = useState({});

  const meId = String(currentUser?._id || '');
  const canViewTrash = admin || groups.some((group) => idOf(group.createdBy) === meId);
  const userOptions = mergeUserOptions(assignableUsers, [asUserOption(currentUser)]);

  const withSubtasks = (list) => (Array.isArray(list) ? list : []).map((task) => ({
    ...task,
    subtasks: task.subtasks || [],
  }));

  const refreshTasks = async () => {
    const todosData = await getTodos();
    setTasks(withSubtasks(todosData));
    if (canViewTrash && showTrash) {
      const trashData = await getTodos({ trash: true });
      setTrashTasks(Array.isArray(trashData) ? trashData : []);
    }
  };

  const addTask = async () => {
    if (!newTask || selectedTags.length === 0) {
      alert('Please enter a task title and select at least one tag');
      return;
    }

    try {
      const tagIds = selectedTags.map((tag) => tag._id);
      const assigneeIds = selectedAssignees.map((user) => user._id);
      const data = await createTodo(newTask, '', tagIds, newProject.trim(), selectedGroupId, assigneeIds);
      setTasks([...tasks, { ...data, subtasks: [] }]);
      setNewTask('');
      setNewProject('');
      setSelectedTags([]);
      setSelectedGroupId('');
      const me = userOptions.find((user) => String(user._id) === meId);
      setSelectedAssignees(me ? [me] : []);
    } catch (error) {
      console.error('Error creating task:', error);
      alert(error.response?.data?.message || 'Error creating task. Please try again.');
    }
  };

  const addNewTag = async () => {
    if (!newTagName.trim()) {
      alert('Please enter a tag name');
      return;
    }

    try {
      const newTag = await createTag(newTagName.trim(), newTagColor);
      setAvailableTags([...availableTags, newTag]);
      setNewTagName('');
      setNewTagColor('#2196f3');
      setOpenTagDialog(false);
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Error creating tag. Tag name might already exist.');
    }
  };

  const canWorkOnTask = (task) => {
    if (admin) return true;
    if (taskOwnerId(task) === meId) return true;
    if (assignedUserIds(task).includes(meId)) return true;
    const groupId = idOf(task.groupId);
    return Boolean(groupId && groups.some((group) => String(group._id) === groupId));
  };

  const patchTask = async (id, updates) => {
    const current = tasks.find((t) => (t._id || t.id) === id);
    if (!current) return;
    setTasks((prev) => prev.map((t) => ((t._id || t.id) === id ? { ...t, ...updates } : t)));
    try {
      const updated = await updateTodo(id, updates);
      if (updated && updated._id) {
        setTasks((prev) =>
          prev.map((t) =>
            (t._id || t.id) === id
              ? { ...t, ...updated, subtasks: t.subtasks || [] }
              : t
          )
        );
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setTasks((prev) => prev.map((t) => ((t._id || t.id) === id ? current : t)));
      alert(error.response?.data?.message || 'Could not save task. Please try again.');
    }
  };

  const toggle = (id) => {
    const task = tasks.find((t) => (t._id || t.id) === id);
    if (!task) return;
    patchTask(id, { completed: !task.completed });
  };

  const togglePriority = (id) => {
    const task = tasks.find((t) => (t._id || t.id) === id);
    if (!task) return;
    patchTask(id, { priority: !task.priority });
  };

  const openEdit = (task) => {
    setEditTaskId(task._id || task.id);
    setEditTitle(task.title || '');
    setEditProject(task.project || '');
    setEditDescription(task.description || '');
    setEditTags(Array.isArray(task.tags) ? task.tags : []);
    setEditAssignees((task.assignedTo || []).filter((person) => typeof person === 'object'));
    setEditGroupId(task.groupId?._id || task.groupId || '');
    setEditPriority(!!task.priority);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTitle.trim() || editTags.length === 0) {
      alert('Enter a title and at least one tag');
      return;
    }
    setSavingEdit(true);
    try {
      await updateTodo(editTaskId, {
        title: editTitle.trim(),
        project: editProject.trim(),
        description: editDescription,
        tags: editTags.map((tag) => tag._id),
        assignedTo: editAssignees.map((user) => user._id),
        groupId: editGroupId || null,
        priority: editPriority,
      });
      setEditOpen(false);
      await refreshTasks();
    } catch (error) {
      console.error('Error editing task:', error);
      alert(error.response?.data?.message || 'Could not save task. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (id) => {
    const task = tasks.find((t) => (t._id || t.id) === id);
    if (task && !canWorkOnTask(task)) {
      alert('Only the creator, an assignee, or an admin can delete this task.');
      return;
    }
    if (!window.confirm('Move this task to trash? An admin can restore it within 30 days.')) {
      return;
    }
    try {
      await deleteTodo(id);
      setTasks(tasks.filter((t) => t._id !== id && t.id !== id));
      setExpandedTasks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSubtaskForms((prev) => {
        const { [id]: removed, ...rest } = prev;
        return rest;
      });
      setNewSubtasks((prev) => {
        const { [id]: removed, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(error.response?.data?.message || 'Could not delete task.');
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreTodo(id);
      setTrashTasks((prev) => prev.filter((task) => (task._id || task.id) !== id));
      await refreshTasks();
    } catch (error) {
      console.error('Error restoring task:', error);
      alert(error.response?.data?.message || 'Could not restore task.');
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Permanently delete this task? This cannot be undone.')) return;
    try {
      await deleteTodo(id);
      setTrashTasks((prev) => prev.filter((task) => (task._id || task.id) !== id));
    } catch (error) {
      console.error('Error permanently deleting task:', error);
      alert(error.response?.data?.message || 'Could not permanently delete task.');
    }
  };

  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSubtaskForm = (taskId) => {
    setSubtaskForms((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const addSubtask = (taskId) => {
    const subtaskTitle = newSubtasks[taskId];
    if (!subtaskTitle?.trim()) {
      alert('Please enter a subtask title');
      return;
    }

    const newSubtask = {
      id: Date.now(),
      title: subtaskTitle.trim(),
      completed: false,
    };

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task._id === taskId || task.id === taskId
          ? { ...task, subtasks: [...(task.subtasks || []), newSubtask] }
          : task
      )
    );

    setNewSubtasks((prev) => ({ ...prev, [taskId]: '' }));
    setSubtaskForms((prev) => ({ ...prev, [taskId]: false }));
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        (task._id === taskId || task.id === taskId)
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId
                  ? { ...subtask, completed: !subtask.completed }
                  : subtask
              ),
            }
          : task
      )
    );
  };

  const removeSubtask = (taskId, subtaskId) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        (task._id === taskId || task.id === taskId)
          ? {
              ...task,
              subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId),
            }
          : task
      )
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todosData, tagsData, groupsData, assignableData] = await Promise.all([
          getTodos(),
          getTags(),
          getGroups().catch(() => []),
          getAssignableUsers().catch(() => []),
        ]);
        setTasks(withSubtasks(todosData));
        setAvailableTags(Array.isArray(tagsData) ? tagsData : []);
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        const people = Array.isArray(assignableData) ? assignableData : [];
        setAssignableUsers(people);
        const me = people.find((user) => String(user._id) === meId) || asUserOption(currentUser);
        setSelectedAssignees(me ? [me] : []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!showTrash || !canViewTrash) {
      setTrashTasks([]);
      return;
    }
    getTodos({ trash: true }).then((data) => setTrashTasks(Array.isArray(data) ? data : []));
  }, [showTrash, canViewTrash]);

  const renderAssigneePicker = (value, onChange) => (
    <Autocomplete
      multiple
      options={mergeUserOptions(userOptions, value)}
      getOptionLabel={userOptionLabel}
      isOptionEqualToValue={(option, selected) => String(option._id) === String(selected._id)}
      value={value}
      onChange={(event, next) => onChange(next)}
      renderTags={(selected, getTagProps) =>
        selected.map((option, index) => (
          <Chip
            variant="outlined"
            label={option.name || option.email}
            {...getTagProps({ index })}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Assign to"
          placeholder={userOptions.length ? 'Choose people' : 'You (no group members yet)'}
        />
      )}
    />
  );

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card title="Add New Task">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Task title..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <TextField
              fullWidth
              label="Project"
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel id="share-group-label">Share with group</InputLabel>
              <Select
                labelId="share-group-label"
                label="Share with group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <MenuItem value="">Just me</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group._id} value={group._id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {renderAssigneePicker(selectedAssignees, setSelectedAssignees)}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Autocomplete
                multiple
                options={availableTags}
                getOptionLabel={(option) => option.name}
                value={selectedTags}
                onChange={(event, newValue) => setSelectedTags(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.name}
                      style={{ backgroundColor: option.color, color: 'white' }}
                      {...getTagProps({ index })}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select tags *"
                    placeholder="Choose tags for this task"
                  />
                )}
                sx={{ flexGrow: 1 }}
              />

              <IconButton
                onClick={() => setOpenTagDialog(true)}
                color="primary"
                title="Create new tag"
              >
                <AddIcon />
              </IconButton>
            </Box>

            <Button variant="contained" onClick={addTask}>
              Add Task
            </Button>
          </Box>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h6">Tasks List</Typography>
            {canViewTrash && (
              <Button size="small" variant={showTrash ? 'contained' : 'outlined'} onClick={() => setShowTrash((prev) => !prev)}>
                {showTrash ? 'Hide trash' : 'Show trash'}
              </Button>
            )}
          </Box>
          {admin && (
            <Alert severity="info">
              Admin view: you can see and edit every user&apos;s tasks. Owner is labeled on each task.
            </Alert>
          )}
          {tasks.length === 0 ? (
            <Card title={UNGROUPED_TITLE}>
              <Typography color="text.secondary" sx={{ p: 2 }}>
                No tasks yet. Add one to get started.
              </Typography>
            </Card>
          ) : (
            groupTasksByProject(tasks).map((group) => (
              <Card key={group.key} title={group.displayName}>
                <List>
                  {group.tasks.map((task) => {
                    const taskId = task._id || task.id;
                    const isExpanded = expandedTasks.has(taskId);
                    const showSubtaskForm = subtaskForms[taskId];
                    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                    const canEdit = canWorkOnTask(task);

                    return (
                      <Box key={taskId}>
                        <ListItem
                          secondaryAction={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <IconButton
                                onClick={() => toggleSubtaskForm(taskId)}
                                color="primary"
                                title="Add subtask"
                                size="small"
                              >
                                <AddIcon />
                              </IconButton>
                              {hasSubtasks && (
                                <IconButton
                                  onClick={() => toggleTaskExpansion(taskId)}
                                  title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                                  size="small"
                                >
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              )}
                              {canEdit && (
                                <IconButton
                                  onClick={() => openEdit(task)}
                                  title="Edit task"
                                  size="small"
                                >
                                  <EditIcon />
                                </IconButton>
                              )}
                              {canEdit && (
                                <IconButton edge="end" onClick={() => remove(taskId)} title="Move to trash">
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </Box>
                          }
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                              <Checkbox
                                checked={!!task.completed}
                                onChange={() => toggle(taskId)}
                                title="Mark complete"
                              />
                              <ListItemText
                                primary={task.title}
                                secondary={taskSecondary(task, admin)}
                                sx={{ textDecoration: task.completed ? 'line-through' : 'none' }}
                              />
                              {hasSubtasks && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  ({task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length})
                                </Typography>
                              )}
                              <FormControlLabel
                                sx={{ ml: 1, mr: 0, whiteSpace: 'nowrap' }}
                                control={
                                  <Checkbox
                                    checked={!!task.priority}
                                    onChange={() => togglePriority(taskId)}
                                    size="small"
                                    color="warning"
                                    title="Priority"
                                  />
                                }
                                label={<Typography variant="caption">Priority</Typography>}
                              />
                            </Box>

                            {task.tags && task.tags.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 5, alignItems: 'center' }}>
                                {task.tags.map((tag, index) => (
                                  <Chip
                                    key={tag._id || index}
                                    label={tag.name}
                                    size="small"
                                    style={{
                                      backgroundColor: tag.color,
                                      color: 'white',
                                      fontSize: '0.7rem',
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        </ListItem>

                        <Collapse in={showSubtaskForm}>
                          <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <TextField
                                size="small"
                                placeholder="Enter subtask..."
                                value={newSubtasks[taskId] || ''}
                                onChange={(e) => setNewSubtasks((prev) => ({
                                  ...prev,
                                  [taskId]: e.target.value,
                                }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addSubtask(taskId);
                                  }
                                }}
                                sx={{ flexGrow: 1 }}
                              />
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => addSubtask(taskId)}
                              >
                                Add
                              </Button>
                              <Button
                                size="small"
                                onClick={() => toggleSubtaskForm(taskId)}
                              >
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                        </Collapse>

                        <Collapse in={isExpanded && hasSubtasks}>
                          <Box sx={{ pl: 4 }}>
                            <Divider sx={{ mb: 1 }} />
                            {task.subtasks.map((subtask) => (
                              <ListItem
                                key={subtask.id}
                                dense
                                secondaryAction={
                                  <IconButton
                                    edge="end"
                                    onClick={() => removeSubtask(taskId, subtask.id)}
                                    size="small"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                }
                              >
                                <Checkbox
                                  checked={subtask.completed}
                                  onChange={() => toggleSubtask(taskId, subtask.id)}
                                  size="small"
                                />
                                <ListItemText
                                  primary={subtask.title}
                                  sx={{
                                    textDecoration: subtask.completed ? 'line-through' : 'none',
                                    '& .MuiListItemText-primary': {
                                      fontSize: '0.9rem',
                                    },
                                  }}
                                />
                              </ListItem>
                            ))}
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
                </List>
              </Card>
            ))
          )}

          {canViewTrash && showTrash && (
            <Card title="Trash">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Deleted tasks stay here for 30 days, then are permanently removed.
              </Typography>
              {trashTasks.length === 0 ? (
                <Typography color="text.secondary">Trash is empty.</Typography>
              ) : (
                <List>
                  {trashTasks.map((task) => {
                    const taskId = task._id || task.id;
                    return (
                      <ListItem
                        key={taskId}
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={() => handleRestore(taskId)}>
                              Restore
                            </Button>
                            {admin && (
                              <Button size="small" color="error" onClick={() => handlePermanentDelete(taskId)}>
                                Delete forever
                              </Button>
                            )}
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={task.title}
                          secondary={`${taskSecondary(task, admin) ? `${taskSecondary(task, admin)} · ` : ''}Deleted ${formatDeletedAt(task.deletedAt)}`}
                          sx={{ opacity: 0.75 }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Card>
          )}
        </Box>
      </Grid>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit task</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <TextField
              fullWidth
              label="Project"
              value={editProject}
              onChange={(e) => setEditProject(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel id="edit-group-label">Share with group</InputLabel>
              <Select
                labelId="edit-group-label"
                label="Share with group"
                value={editGroupId}
                onChange={(e) => setEditGroupId(e.target.value)}
              >
                <MenuItem value="">Just me</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group._id} value={group._id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {renderAssigneePicker(editAssignees, setEditAssignees)}
            <Autocomplete
              multiple
              options={availableTags}
              getOptionLabel={(option) => option.name}
              value={editTags}
              onChange={(event, newValue) => setEditTags(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.name}
                    style={{ backgroundColor: option.color, color: 'white' }}
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags *"
                  placeholder="Choose tags"
                />
              )}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editPriority}
                  onChange={(e) => setEditPriority(e.target.checked)}
                  color="warning"
                />
              }
              label="Priority"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={savingEdit}>
            {savingEdit ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openTagDialog} onClose={() => setOpenTagDialog(false)}>
        <DialogTitle>Create New Tag</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Tag Name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">Color:</Typography>
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                style={{ border: 'none', borderRadius: '4px', width: '40px', height: '40px' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTagDialog(false)}>Cancel</Button>
          <Button onClick={addNewTag} variant="contained">Create Tag</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
