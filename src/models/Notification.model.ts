import { model, Schema } from "mongoose";
import { TNotificationModel } from "../utils/types";

const notification_schema: Schema<TNotificationModel> =
  new Schema<TNotificationModel>({
    user: { type: Schema.Types.ObjectId, required: true },
    content: { type: String, required: true },
    initiated_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    read: Boolean,
    ref: {
      type: {
        mode: {
          type: String,
          enum: ["post", "comment", "react", "follow"],
        },
        ref_id: Schema.Types.ObjectId,
        post_id: Schema.Types.ObjectId,
      },
    },
  });

const notification_model = model("Notification", notification_schema);

export default notification_model;
