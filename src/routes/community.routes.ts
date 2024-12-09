import { Router } from "express";
import {
  create_community,
  edit_community,
  get_communities,
  get_community,
  get_community_posts,
  join_community,
} from "../controllers/community.controller";
import { decode_token, validate_token } from "../middlewares/token.middleware";
import multer from "multer";

const community_router = Router();

// * Configures the multer library to store the uploaded file data (including the bytes) in the application memory
const upload = multer({ storage: multer.memoryStorage() });

// * The decode_token middleware below decrypts and retrieves the value of the user token
community_router.post("/get", decode_token as any, get_communities as any);
community_router.get(
  "/:community_id",
  decode_token as any,
  get_community as any
);

// * Validates the user access token
community_router.use(validate_token as any);

community_router.post("/create", create_community as any);
community_router.post("/join", join_community as any);
community_router.get("/:community_id/posts", get_community_posts as any);
community_router.put(
  "/:community_id",
  upload.fields([
    { name: "cover_image", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  edit_community as any
);

export default community_router;
