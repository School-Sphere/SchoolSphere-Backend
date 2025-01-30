const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const { errorMiddleware } = require("./middlewares/error");
const models = require("./models/models");
const SocketManager = require("./server/services/SocketManager");
const { SOCKET_CONFIG } = require("./config/socket_events");
const {
  authRouter,
  adminRouter,
  schoolRouter,
  studentRouter,
  teacherRouter,
  paymentRouter,
  chatRouter,
} = require("./routes");

require("dotenv").config();

const app = express();
const http = require("http");
const server = http.createServer(app);

// Enable CORS for all origins
app.use(cors()); // <-- Add this line

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(errorMiddleware);

app.use(authRouter, errorMiddleware);
app.use(adminRouter, errorMiddleware);
app.use(teacherRouter, errorMiddleware);
app.use(schoolRouter, errorMiddleware);
app.use(studentRouter, errorMiddleware);
app.use(paymentRouter, errorMiddleware);
app.use(chatRouter, errorMiddleware);
const PORT = process.env.PORT || 5000;

const syncAllIndexes = async (models) => {
  try {
    for (const modelName in models) {
      if (models.hasOwnProperty(modelName)) {
        const model = models[modelName];
        if (model && model.syncIndexes) {
          // console.log(`Syncing indexes for: ${modelName}`);
          await model.syncIndexes();
        }
      }
    }
    console.log("All indexes synced successfully.");
  } catch (err) {
    console.error("Error syncing indexes:", err);
  }
};

mongoose
  .connect(process.env.DB)
  .then(() => {
    console.log("Database connection successful");

    try {
      // Initialize Socket.IO
      SocketManager.initialize(server);
      console.log("Socket.IO initialized successfully");

      server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    } catch (error) {
      console.error("Failed to initialize Socket.IO:", error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });