import dotenv from "dotenv";

import connectDB from "./db/index.js";

dotenv.config({
  path: "./env",
});

connectDB() //? connectDB being a async method always returns a promise
  .then(() => {
    app.on("error", () => {
      console.log("ERROR: App not able to talk to DB ", error);
      throw error;
    });

    app.listen(process.env.PORT || 8080, () => {
      console.log(`Server is running on PORT:${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("mongoDB connection failed !! ", error);
  });

import express from "express";
const app = express();

//? One way of writting code to connect to DB
// function connectDB() {} //!Function declaration
// connectDB(); //!Function call

//? Approach-1 But above code can also be written as IIFE which is invoked immidiately
/*
( async () => {
    try {
      await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
      app.on("error", () => {   //? This error handling is for app: what if DB connected but our app isn't able to talk to DB
        console.log("ERROR: ", error);
        throw error;
      });

      app.listen(process.env.PORT, () => {
        console.log(`App is listenig on on PORT ${process.env.PORT}`);
      });
    } catch (error) {   //? This error handling is for DB connection
      console.log("ERROR: ", error);
      throw error;
    }
  }
)();   //TODO Approach-2 : Professionally we have to do all the above things inside DB folder connecting to DB and hadling errors
*/
