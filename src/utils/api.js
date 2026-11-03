// what is the endpoint/url for the getTodos api? "localhost:5000/api/todos/"
// Axios is a library that allows you to make HTTP requests from the browser
// Axios is asynchronous
import axios from "axios";

// http requests
// GET, POST, PUT, DELETE

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const http = axios.create({
  timeout: 60000,
});

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

const getTodos = async () => {
    try { 
        const response = await http.get(`${API}/api/todos/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching todos:", error);
        return [];
    }
}

const createTodo = async (title, description = "", tags = [], project = "", groupId = "") => {
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
        const response = await http.post(`${API}/api/todos/create`, body);
        return response.data;
    } catch (error) {
        console.error("Error creating todo:", error);
        throw error;
    }
}

const updateTodo = async (id, updates = {}) => {
    try {
        const response = await http.put(`${API}/api/todos/${id}`, updates);
        return response.data;
    } catch (error) {
        console.error("Error updating todo:", error);
        throw error;
    }
}

const deleteTodo = async (id) => {
    try {
        const response = await http.delete(`${API}/api/todos/delete/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting todo:", error);
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
const signupUser = async (name, email, password) => {
    try {
        const response = await http.post(`${API}/api/user/create`, {
            name: name,
            email: email,
            password: password
        });
        return response.data;
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
}

const loginUser = async (email, password) => {
    try {
        const response = await http.post(`${API}/api/user/login`, {
            email: email,
            password: password
        });
        return response.data;
    } catch (error) {
        console.error("Error logging in user:", error);
        throw error;
    }
}

const getGroups = async () => {
    try {
        const response = await http.get(`${API}/api/groups/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching groups:", error);
        throw error;
    }
}

const createGroup = async (name) => {
    try {
        const response = await http.post(`${API}/api/groups/`, { name });
        return response.data;
    } catch (error) {
        console.error("Error creating group:", error);
        throw error;
    }
}

const addGroupMember = async (groupId, email) => {
    try {
        const response = await http.post(`${API}/api/groups/${groupId}/members`, { email });
        return response.data;
    } catch (error) {
        console.error("Error adding group member:", error);
        throw error;
    }
}

const deleteGroup = async (groupId) => {
    try {
        const response = await http.delete(`${API}/api/groups/${groupId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting group:", error);
        throw error;
    }
}

const getAdminUsers = async () => {
    try {
        const response = await http.get(`${API}/api/user/admin/users`);
        return response.data;
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
}

const createAdminUser = async (name, email, password, role) => {
    try {
        const body = { name, email, password };
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

const setUserBanned = async (id, banned) => {
    try {
        const response = await http.patch(`${API}/api/user/admin/users/${id}`, { banned });
        return response.data;
    } catch (error) {
        console.error("Error updating ban:", error);
        throw error;
    }
}

const setUserRole = async (id, role) => {
    try {
        const response = await http.patch(`${API}/api/user/admin/users/${id}`, { role });
        return response.data;
    } catch (error) {
        console.error("Error updating role:", error);
        throw error;
    }
}

const makeHead = async (id) => {
    try {
        const response = await http.post(`${API}/api/user/admin/users/${id}/make-head`);
        return response.data;
    } catch (error) {
        console.error("Error transferring head:", error);
        throw error;
    }
}

const removeAdminUser = async (id) => {
    try {
        const response = await http.delete(`${API}/api/user/admin/users/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error removing user:", error);
        throw error;
    }
}

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
    getTags,
    createTag,
    signupUser,
    loginUser,
    getGroups,
    createGroup,
    addGroupMember,
    deleteGroup,
    getAdminUsers,
    createAdminUser,
    setUserBanned,
    setUserRole,
    makeHead,
    removeAdminUser,
    resetUserTasks,
};
