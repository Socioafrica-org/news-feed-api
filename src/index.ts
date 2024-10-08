import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import bodyParser from "body-parser";
import connect_mongodb from "./utils/db.config";
import cookieParser from "cookie-parser";
import topic_router from "./routes/topic.route";
import post_router from "./routes/post.route";
import comment_router from "./routes/comment.route";
import reaction_router from "./routes/reaction.route";
import bookmark_router from "./routes/bookmark.route";
import share_router from "./routes/share.route";
import user_router from "./routes/user.route";
import community_router from "./routes/community.route";
import notification_router from "./routes/notification.route";

// * Load the environmental variables from the .env file to the process.ENV object
config();

// * Connect to the mongodb database
connect_mongodb();

// * Configure the appplications' port
const PORT = process.env.PORT || 5000;

// * Configure the express app
const app = express();

// * Log the HTTP request details and time
app.use((req: Request, res: Response, next: NextFunction) => {
  const time = new Date(Date.now()).toString();
  console.log(req.method, req.hostname, req.path, time);
  next();
});

// * Configure CORS
app.use(cors());
// * Parse the cookies sent to the http request to the 'req.cookies' property
app.use(cookieParser());
// * Enable the express app to parse REST JSON data
app.use(bodyParser.json());
// * Enable the express app to parse REST URL encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// ! REMOVE: Add the token_data field to the req object (just for test purposes)
// app.use(((
//   req: Request & TExtendedRequestTokenData,
//   res: Response,
//   next: NextFunction
// ) => {
//   req.token_data = {
//     username: (req.headers.username as string) || "",
//     user_id: (req.headers.user_id as string) || "",
//   };
//   next();
// }) as any);

// * Handles all requests to the /topics endpoint
app.use("/topics", topic_router);
// * Handles all requests to the /post endpoint
app.use("/posts", post_router);
// * Handles all requests to the /comment endpoint
app.use("/comments", comment_router);
// * Handles all requests to the /reaction endpoint
app.use("/reactions", reaction_router);
// * Handles all requests to the /bookmark endpoint
app.use("/bookmarks", bookmark_router);
// * Handles all requests to the /share endpoint
app.use("/share", share_router);
// * Handles all requests to the /user endpoint
app.use("/user", user_router);
// * Handles all requests to the /community endpoint
app.use("/community", community_router);
// * Handles all requests to the /notification endpoint
app.use("/notification", notification_router);

app.use("*", (req: Request, res: Response, next: NextFunction) => {
  const time = new Date(Date.now()).toString();
  console.error("NOT FOUND", req.method, req.hostname, req.path, time);
  return res.status(404).send("Not found");
});

app.use((err: any, req: Request, res: Response) => {
  console.error(err);
  return res.status(500).json("Internal server error");
});

app.listen(PORT, () => {
  console.log(`Application listening on port ${PORT}`);
});
