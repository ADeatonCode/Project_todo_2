require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const todoRoutes = require("./routes/todoRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const tagRoutes = require("./routes/tagRoutes.js");

// to use enviroment variables access the process.env //
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongodb connected")
  } catch (err) {
    console.error("mongodb connection error: ", err);
  }
};

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  }
}));
app.use(express.json());

connectDB()
const PORT = process.env.PORT || 5000;

//const errorHandler = require("./middleware/errorHandler.js");
//app.use(errorHandler.errorHandler());



app.use("/api/todos", todoRoutes);
app.use("/api/user", userRoutes);
app.use("/api/tags", tagRoutes);

app.listen(PORT, () => console.log(`server is running on port ${PORT}`));
