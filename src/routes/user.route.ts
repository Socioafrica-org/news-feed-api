import { Router } from "express";
import multer from "multer";
import { decode_token, validate_token } from "../middlewares/token.middleware";
import {
  edit_user_account_info,
  edit_user_personal_info,
  follow_unfollow_user,
  get_user,
  get_user_communities,
  get_user_disliked_posts,
  get_user_followees,
  get_user_followers,
  get_user_liked_posts,
  get_user_posts,
  get_user_saved_comments,
  get_user_saved_posts,
} from "../controllers/user.controller";

const user_router = Router();

// * Configures the multer library to store the uploaded file data (including the bytes) in the application memory
const upload = multer({ storage: multer.memoryStorage() });

user_router.get("/:username", decode_token as any, get_user as any);
user_router.get("/:username/posts", get_user_posts);
user_router.get("/:username/posts/like", get_user_liked_posts);
user_router.get("/:username/posts/dislike", get_user_disliked_posts);
user_router.get("/:username/followers", get_user_followers);
user_router.get("/:username/followees", get_user_followees);
user_router.get("/:username/communities", get_user_communities);

// * The validate_token middleware below authenticates the user token
user_router.use(validate_token as any);

user_router.put("/personal", edit_user_personal_info as any);
user_router.put(
  "/account",
  upload.fields([
    { name: "cover_image", maxCount: 1 },
    { name: "profile_image", maxCount: 1 },
  ]),
  edit_user_account_info as any
);
user_router.post("/follow/:username", follow_unfollow_user as any);
user_router.get("/:username/posts/saved", get_user_saved_posts);
user_router.get("/:username/comments/saved", get_user_saved_comments);

export default user_router;
