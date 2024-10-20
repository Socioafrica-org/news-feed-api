import { NextFunction, Request, Response, Router } from "express";
import {
  create_post,
  get_post,
  get_posts,
} from "../controllers/post.controller";
import multer from "multer";
import { decode_token, validate_token } from "../middlewares/token.middleware";
import { get_user_topics } from "../middlewares/get-user-topics.middleware";

// * Configures the multer library to store the uploaded file data (including the bytes) in the application memory
const upload = multer({ storage: multer.memoryStorage() });
const post_router = Router();

// * The decode_token middleware below decrypts and retrieves the value of the user token
post_router.get("/:post_id", decode_token as any, get_post as any);
// * The get user topics middleware decodes the user acces token to get the username and retrieves topics relating to said user
post_router.post(
  "/all",
  decode_token as any,
  get_user_topics as any,
  get_posts as any
);

// * The validate_token middleware below authenticates the user token
post_router.use(validate_token as any);

// * The multer middleware in the request below processes uploaded files and adds them to the Express Js req.files object
post_router.post("/", upload.array("images"), create_post as any);

export default post_router;
