# CRUD Frontend Playground 🚀

> A plug-and-play React + Vite frontend for practicing Express + MongoDB CRUD endpoints without writing UI boilerplate.

---

[![Node.js](https://img.shields.io/badge/node-%3E%3D14.x-brightgreen)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/vite-%3E%3D4.x-blue)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%3E%3D18.x-cyan)](https://reactjs.org/)

---

## 📋 Table of Contents

1. [Prerequisites](#%EF%B8%8F-prerequisites)
2. [Installation](#%EF%B8%8F-installation)
3. [Running the App](#%EF%B8%8F-running-the-app)
4. [Project Structure](#%EF%B8%8F-project-structure)
5. [API Endpoints (CRUD)](#%EF%B8%8F-api-endpoints-crud)
6. [Exercises](#%EF%B8%8F-exercises)
7. [Next Steps](#%EF%B8%8F-next-steps)
8. [License](#%EF%B8%8F-license)

---

## 🔧 Prerequisites

* **Node.js** v14+ installed
* Your Express + Mongoose backend running at `http://localhost:5000/api`
* Basic understanding of HTTP methods (GET, POST, PUT, DELETE)

---

## ⚙️ Installation

```bash
# Clone this repository
git clone <your-repo-url>

# Install dependencies
npm install
```

---

## ▶️ Running the App

```bash
# Start the development server
npm run dev
```

* Frontend will be available at `http://localhost:5173`
* Ensure your backend API is live at `http://localhost:5000/api`

---

## 🗂 Project Structure

```plaintext
src/
├── api.js         # Axios instance (baseURL: http://localhost:5000/api)
├── App.jsx        # React Router setup
└── pages/
    ├── List.jsx    # GET /items → list all items + Edit/Delete actions
    ├── View.jsx    # GET /items/:id → item details view
    ├── Form.jsx    # POST /items & PUT /items/:id → create/edit form
    └── NotFound.jsx # 404 fallback
```

---

## 🔌 API Endpoints (CRUD)

| Operation | Method | Route        | Component/Hook    |
| --------- | ------ | ------------ | ----------------- |
| Create    | POST   | `/items`     | Form.jsx          |
| Read All  | GET    | `/items`     | List.jsx          |
| Read One  | GET    | `/items/:id` | View\.jsx         |
| Update    | PUT    | `/items/:id` | Form.jsx          |
| Delete    | DELETE | `/items/:id` | List.jsx (button) |

---

## 🎓 Exercises

1. **Connect**: Point `api.js` to your backend routes.
2. **CRUD**: Test creating, reading, updating, and deleting items.
3. **Error Handling**: Add loading states & error messages.
4. **Styling**: Integrate a UI library (MUI, Tailwind, etc.).
5. **Extend**: Add a new feature—e.g., search or filters.

---

## 🚀 Next Steps

* Implement authentication (JWT, OAuth).
* Add pagination or infinite scroll.
* Connect real-world models: blog posts, tasks, user profiles.
* Deploy frontend & backend to a cloud provider.

---

## 📄 License

This project is [MIT](LICENSE) licensed. Feel free to copy, tweak, and teach!
