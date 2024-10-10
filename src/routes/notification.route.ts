import { Router } from "express";
import { get_notifications } from "../controllers/notification.controller";
import { validate_token } from "../middlewares/token.middleware";

const notification_router = Router();

notification_router.get("/", validate_token as any, get_notifications as any);

export default notification_router;
