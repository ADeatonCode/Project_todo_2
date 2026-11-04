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
    console.log("mongodb connected");
    const User = require("./models/user.js");
    const { repairHeadUniqueness, backfillUsernames } = require("./utils/admin.js");
    await repairHeadUniqueness(User);
    try {
      await backfillUsernames(User);
    } catch (backfillErr) {
      console.error("Could not backfill usernames:", backfillErr.message);
    }
    try {
      const indexes = await User.collection.indexes();
      const emailIdx = indexes.find((idx) => idx.name === "email_1" && idx.unique && !idx.sparse);
      if (emailIdx) {
        await User.collection.dropIndex("email_1");
      }
    } catch (indexErr) {
      if (indexErr.code !== 27 && indexErr.codeName !== "IndexNotFound") {
        console.error("Could not refresh email index:", indexErr.message);
      }
    }
    try {
      await User.syncIndexes();
    } catch (indexErr) {
      console.error("Could not sync unique head index:", indexErr.message);
    }
    const { purgeExpiredTrash } = require("./controllers/todoController.js");
    await purgeExpiredTrash();
    setInterval(() => {
      purgeExpiredTrash().catch((err) => console.error("trash purge failed:", err));
    }, 60 * 60 * 1000);
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
