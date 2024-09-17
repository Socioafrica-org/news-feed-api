import { Router } from "express";
import multer from "multer";
import { validate_token } from "../middlewares/validate-token.middleware";
import {
  edit_user_account_info,
  edit_user_personal_info,
} from "../controllers/user.controller";

const user_router = Router();

// * Configures the multer library to store the uploaded file data (including the bytes) in the application memory
const upload = multer({ storage: multer.memoryStorage() });

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

export default user_router;
