import { NextFunction, Request, Response, Router } from "express";
import {
  create_post,
  get_post,
  get_posts,
} from "../controllers/post.controller";
import multer from "multer";

// * Configures the multer library to store the uploaded file data (including the bytes) in the application memory
const upload = multer({ storage: multer.memoryStorage() });
const post_router = Router();

// TODO: Add middleware to authenticate user token
// * The multer middleware in the request below processes uploaded files and adds them to the Express Js req.files object
post_router.post("/", upload.array("images"), create_post as any);
post_router.get("/:post_id", get_post);
// ! REMOVE: Remove the middleware and add one which verifies the user acces token and retrieves topics relating to said user
post_router.post(
  "/all",
  ((req: Request & { topics: string[] }, res: Response, next: NextFunction) => {
    req.topics = req.body.topics;
    next();
  }) as any,
  get_posts
);

export default post_router;
