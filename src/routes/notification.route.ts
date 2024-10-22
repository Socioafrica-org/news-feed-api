import { Router } from "express";
import {
  get_notifications,
  read_all_notifications,
  read_notification,
} from "../controllers/notification.controller";
import { validate_token } from "../middlewares/token.middleware";

const notification_router = Router();

notification_router.get("/", validate_token as any, get_notifications as any);
notification_router.put(
  "/:notification_id/read",
  validate_token as any,
  read_all_notifications as any
);
notification_router.get(
  "/read/:notification_id",
  validate_token as any,
  read_notification as any
);

export default notification_router;
