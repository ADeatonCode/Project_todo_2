/*
 * Tiny helpers that talk to the Project TODO backend API.
 * Axios sends GET/POST/PUT/DELETE requests over the network.
 * Each function below asks the server for one job (list tasks, login, and so on).
 * VITE_API_URL can point at a hosted server; otherwise it uses localhost:5000.
 */
import axios from "axios";


const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const http = axios.create({
  timeout: 60000,
});

// Attach the logged-in user's token/id to every request so the server knows who we are.
http.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("todoUser");
    const user = raw ? JSON.parse(raw) : null;
    if (user?._id || user?.token) {
      config.headers = config.headers || {};
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
      if (user._id) {
        config.headers["X-User-Id"] = user._id;
      }
    }
  } catch {
    // ignore malformed localStorage
  }
  return config;
});

/** Ask the server for this user's tasks (or trash if options.trash). */
const getTodos = async (options = {}) => {
    try { 
        const params = {};
        if (options && options.trash) {
            params.trash = 1;
        }
        const response = await http.get(`${API}/api/todos/`, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching todos:", error);
        return [];
    }
}

/** Create a new task on the server. */
const createTodo = async (title, description = "", tags = [], project = "", groupId = "", assignedTo = [], schedule = {}) => {
    try {
        const body = {
            title: title,
            description: description,
            tags: tags,
            project: project
        };
        if (groupId) {
            body.groupId = groupId;
        }
        if (Array.isArray(assignedTo) && assignedTo.length > 0) {
            body.assignedTo = assignedTo;
        }
        if (schedule && typeof schedule === "object") {
            if (Object.prototype.hasOwnProperty.call(schedule, "dueDate")) {
                body.dueDate = schedule.dueDate;
            }
            if (Object.prototype.hasOwnProperty.call(schedule, "repeatEvery")) {
                body.repeatEvery = schedule.repeatEvery;
            }
            if (Object.prototype.hasOwnProperty.call(schedule, "repeatUnit")) {
                body.repeatUnit = schedule.repeatUnit;
            }
            if (Object.prototype.hasOwnProperty.call(schedule, "showBeforeValue")) {
                body.showBeforeValue = schedule.showBeforeValue;
            }
            if (Object.prototype.hasOwnProperty.call(schedule, "showBeforeUnit")) {
                body.showBeforeUnit = schedule.showBeforeUnit;
            }
        }
        const response = await http.post(`${API}/api/todos/create`, body);
        return response.data;
    } catch (error) {
        console.error("Error creating todo:", error);
        throw error;
    }
}

/** Change fields on an existing task. */
const updateTodo = async (id, updates = {}) => {
    try {
        const response = await http.put(`${API}/api/todos/${id}`, updates);
        return response.data;
    } catch (error) {
        console.error("Error updating todo:", error);
        throw error;
    }
}

/** Move a task to trash (or delete it, depending on the server). */
const deleteTodo = async (id) => {
    try {
        const response = await http.delete(`${API}/api/todos/delete/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting todo:", error);
        throw error;
    }
}

/** Pull a task out of the trash. */
const restoreTodo = async (id) => {
    try {
        const response = await http.post(`${API}/api/todos/${id}/restore`);
        return response.data;
    } catch (error) {
        console.error("Error restoring todo:", error);
        throw error;
    }
}

// Tag API functions
const getTags = async () => {
    try {
        const response = await http.get(`${API}/api/tags/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching tags:", error);
        throw error;
    }
}

/** Make a new tag. */
const createTag = async (name, color = "#2196f3", description = "") => {
    try {
        const response = await http.post(`${API}/api/tags/create`, {
            name: name,
            color: color,
            description: description
        });
        return response.data;
    } catch (error) {
        console.error("Error creating tag:", error);
        throw error;
    }
}

// User API functions
const signupUser = async (name, username, password) => {
    try {
        const response = await http.post(`${API}/api/user/create`, {
            name: name,
            username: username,
            password: password
        });
        return response.data;
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
}

/** Sign in and get back the user plus a token. */
const loginUser = async (username, password) => {
    try {
        const response = await http.post(`${API}/api/user/login`, {
            username: username,
            password: password
        });
        return response.data;
    } catch (error) {
        console.error("Error logging in user:", error);
        throw error;
    }
}

/** List groups this user can see. */
const getGroups = async () => {
    try {
        const response = await http.get(`${API}/api/groups/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching groups:", error);
        throw error;
    }
}

/** Start a new group. */
const createGroup = async (name) => {
    try {
        const response = await http.post(`${API}/api/groups/`, { name });
        return response.data;
    } catch (error) {
        console.error("Error creating group:", error);
        throw error;
    }
}

/** Add a person to a group by username. */
const addGroupMember = async (groupId, username) => {
    try {
        const response = await http.post(`${API}/api/groups/${groupId}/members`, { username });
        return response.data;
    } catch (error) {
        console.error("Error adding group member:", error);
        throw error;
    }
}

/** Delete a group. */
const deleteGroup = async (groupId) => {
    try {
        const response = await http.delete(`${API}/api/groups/${groupId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting group:", error);
        throw error;
    }
}

/** People I am allowed to assign a task to. */
const getAssignableUsers = async () => {
    try {
        const response = await http.get(`${API}/api/user/assignable`);
        return response.data;
    } catch (error) {
        console.error("Error fetching assignable users:", error);
        throw error;
    }
}

/** Staff-only: list all users. */
const getAdminUsers = async () => {
    try {
        const response = await http.get(`${API}/api/user/admin/users`);
        return response.data;
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
}

/** Staff-only: create a user. */
const createAdminUser = async (name, username, password, role) => {
    try {
        const body = { name, username, password };
        if (role) {
            body.role = role;
        }
        const response = await http.post(`${API}/api/user/admin/users`, body);
        return response.data;
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
}

/** Staff-only: ban or unban a user. */
const setUserBanned = async (id, banned) => {
    try {
        const response = await http.patch(`${API}/api/user/admin/users/${id}`, { banned });
        return response.data;
    } catch (error) {
        console.error("Error updating ban:", error);
        throw error;
    }
}

/** Staff-only: change a user's role. */
const setUserRole = async (id, role) => {
    try {
        const response = await http.patch(`${API}/api/user/admin/users/${id}`, { role });
        return response.data;
    } catch (error) {
        console.error("Error updating role:", error);
        throw error;
    }
}

/** Head-only: transfer the top admin role. */
const makeHead = async (id) => {
    try {
        const response = await http.post(`${API}/api/user/admin/users/${id}/make-head`);
        return response.data;
    } catch (error) {
        console.error("Error transferring head:", error);
        throw error;
    }
}

/** Staff-only: remove a user account. */
const removeAdminUser = async (id) => {
    try {
        const response = await http.delete(`${API}/api/user/admin/users/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error removing user:", error);
        throw error;
    }
}

/** Staff-only: clear a user's tasks. */
const resetUserTasks = async (id) => {
    try {
        const response = await http.post(`${API}/api/user/admin/users/${id}/reset-tasks`);
        return response.data;
    } catch (error) {
        console.error("Error resetting user tasks:", error);
        throw error;
    }
}

export {
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    restoreTodo,
    getTags,
    createTag,
    signupUser,
    loginUser,
    getGroups,
    createGroup,
    addGroupMember,
    deleteGroup,
    getAssignableUsers,
    getAdminUsers,
    createAdminUser,
    setUserBanned,
    setUserRole,
    makeHead,
    removeAdminUser,
    resetUserTasks,
};
