import { Router } from "express";
import { share_unshare_post } from "../controllers/share.controller";
import { validate_token } from "../middlewares/token.middleware";

const share_router = Router();

// * The validate_token middleware below authenticates the user token
share_router.use(validate_token as any);

share_router.post("/", share_unshare_post as any);

export default share_router;
