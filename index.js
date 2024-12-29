const express = require("express");
const mongoose = require("mongoose");
const { errorMiddleware } = require("./middlewares/error");
const models = require("./models/models");

const {
  authRouter,
  adminRouter,
  schoolRouter,
  studentRouter,
  teacherRouter,
  paymentRouter,
} = require("./routes");

require("dotenv").config();

const app = express();
const http = require("http");
const { error } = require("console");
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(errorMiddleware);



app.use(authRouter, errorMiddleware);
app.use(adminRouter, errorMiddleware);
app.use(schoolRouter, errorMiddleware);
app.use(studentRouter, errorMiddleware);
app.use(teacherRouter, errorMiddleware);
app.use(paymentRouter, errorMiddleware);


// initSocket(server);


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

mongoose.connect(process.env.DB).then(() => {
  console.log("connection is successful");


  syncAllIndexes(models);
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});