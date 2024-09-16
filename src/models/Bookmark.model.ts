import { model, Schema } from "mongoose";
import { TBookmarkModel } from "../utils/types";

const bookmark_schema: Schema<TBookmarkModel> = new Schema<TBookmarkModel>({
  user: { required: true, type: Schema.Types.ObjectId, ref: "User" },
  post_id: {
    type: String,
  },
  comment_id: {
    type: String,
  },
});

const bookmark_model = model("Bookmark", bookmark_schema);

export default bookmark_model;
