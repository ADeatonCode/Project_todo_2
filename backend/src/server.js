require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const todoRoutes = require("./routes/todoRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const tagRoutes = require("./routes/tagRoutes.js");
const groupRoutes = require("./routes/groupRoutes.js");

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

const frontendOrigin = process.env.FRONTEND_ORIGIN;
const localOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

if (frontendOrigin) {
  const allowedOrigins = [...localOrigins, frontendOrigin].filter(Boolean);
  const isInfinityFreeOrigin = (origin) =>
    /infinityfreeapp\.com$/.test(origin) ||
    /infinityfree\.com$/.test(origin) ||
    /epizy\.com$/.test(origin);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (isInfinityFreeOrigin(origin)) return cb(null, true);
      return cb(null, false);
    }
  }));
} else {
  // Class demo: Render often has no FRONTEND_ORIGIN, so keep CORS open.
  app.use(cors());
}
app.use(express.json());

connectDB()
const PORT = process.env.PORT || 5000;

//const errorHandler = require("./middleware/errorHandler.js");
//app.use(errorHandler.errorHandler());



app.use("/api/todos", todoRoutes);
app.use("/api/user", userRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/groups", groupRoutes);

app.listen(PORT, () => console.log(`server is running on port ${PORT}`));
