import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import bodyParser from "body-parser";
import connect_mongodb from "./utils/db.config";
import cookieParser from "cookie-parser";
import topic_router from "./routes/topic.routes";
import post_router from "./routes/post.routes";
import comment_router from "./routes/comment.routes";
import reaction_router from "./routes/reaction.routes";
import bookmark_router from "./routes/bookmark.routes";
import share_router from "./routes/share.routes";
import user_router from "./routes/user.routes";
import community_router from "./routes/community.routes";
import notification_router from "./routes/notification.routes";
import search_router from "./routes/search.routes";
import { manage_error_middleware } from "./middlewares/error.middleware";
import manage_metric_middleware from "express-prometheus-middleware";

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

// * Keep track of the application metrics
app.use(
  manage_metric_middleware({
    metricsPath: "/metrics",
    collectDefaultMetrics: true,
    customLabels: ["app"],
    transformLabels(labels, req) {
      // eslint-disable-next-line no-param-reassign
      labels.app = "socio_features";
    },
    requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
    requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
    responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  })
);

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
// * Handles all requests to the /search endpoint
app.use("/search", search_router);

app.use("*", (req: Request, res: Response, next: NextFunction) => {
  const time = new Date(Date.now()).toString();
  console.error("NOT FOUND", req.method, req.hostname, req.path, time);
  return res.status(404).send("Not found");
});

app.use(manage_error_middleware as any);

app.listen(PORT, () => {
  console.log(`Application listening on port ${PORT}`);
});
