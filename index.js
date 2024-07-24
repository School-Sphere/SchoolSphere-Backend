const express = require("express");
const mongoose = require("mongoose");

const { errorMiddleware } = require("./middlewares/error");

const {
  authRouter,
} = require("./routes");

require("dotenv").config();

const app = express();
const http = require("http");
const server = http.createServer(app);
app.use(express.json());
app.use(errorMiddleware);
app.use(authRouter, errorMiddleware);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.DB).then(() => {
  console.log("connection is successful");
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
});