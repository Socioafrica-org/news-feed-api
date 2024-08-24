import { NextFunction, Request, Response, Router } from "express";
import {
  create_post,
  get_post,
  get_posts,
} from "../controllers/post.controller";
import multer from "multer";
import { validate_token } from "../middlewares/validate-token.middleware";
import { get_user_topics } from "../middlewares/get-user-topics.middleware";

// * Configures the multer library to store the uploaded file data (including the bytes) in the application memory
const upload = multer({ storage: multer.memoryStorage() });
const post_router = Router();

post_router.get("/:post_id", get_post);
// * The get user topics middleware decodes the user acces token to get the username and retrieves topics relating to said user
post_router.post("/all", get_user_topics as any, get_posts);

// * The validate_token middleware below authenticates the user token
// * The multer middleware in the request below processes uploaded files and adds them to the Express Js req.files object
post_router.post(
  "/",
  validate_token as any,
  upload.array("images"),
  create_post as any
);

export default post_router;
