import { Router } from "express";
import {
  edit_bookmark,
  get_user_bookmarks,
} from "../controllers/bookmark.controller";
import { validate_token } from "../middlewares/validate-token.middleware";

const bookmark_router = Router();

// * The validate_token middleware below authenticates the user token
bookmark_router.use(validate_token as any);

bookmark_router.get("/", get_user_bookmarks as any);
bookmark_router.post("/", edit_bookmark as any);

export default bookmark_router;
