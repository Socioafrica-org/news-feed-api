import { Router } from "express";
import {
  create_comment,
  edit_comment,
  get_comment,
} from "../controllers/comment.controller";
import { validate_token } from "../middlewares/token.middleware";

const comment_router = Router();

// * Middleware to authenticate user token
comment_router.use(validate_token as any);

comment_router.post("/", create_comment as any);
comment_router.put("/:comment_id", edit_comment as any);
comment_router.get("/:comment_id", get_comment as any);

export default comment_router;
