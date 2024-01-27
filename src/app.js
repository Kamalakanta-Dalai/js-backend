import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
//Routes
import userRouter from "./routes/user.routes.js";

const app = express();

//? This is a middleware to avoid cross-origin-resource-sharing error
// Here origin- defines the addresses from where the data can be accessed
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//?  is used to parse incoming JSON requests and limit the size of the request body.
app.use(express.json({ limit: "16kb" }));

//? refer note-6,8
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

//? This middleware used to serve static files such as images, CSS files, and JavaScript files
app.use(express.static("public"));

//? refer note- 9
app.use(cookieParser());


//routes declaration
app.use("/api/v1/users", userRouter);

export { app };
