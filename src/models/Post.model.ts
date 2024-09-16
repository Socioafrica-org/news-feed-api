import { model, Schema } from "mongoose";
import { TPostModel } from "../utils/types";

const post: Schema<TPostModel> = new Schema({
  content: { required: true, type: String },
  file_urls: { type: [String] },
  user: { required: true, type: Schema.Types.ObjectId, ref: "User" },
  visibility: {
    required: true,
    type: {
      mode: {
        type: String,
        enum: {
          values: ["all", "community", "private"],
        },
      },
      community_id: String,
    },
  },
  topic: { type: String },
  parent_post_id: { type: Schema.Types.ObjectId },
  shared_by: { type: String },
  date_created: { required: true, type: Date },
  reactions: {
    required: true,
    type: [
      {
        user: { required: true, type: Schema.Types.ObjectId, ref: "User" },
        reaction: {
          type: String,
          enum: { values: ["like", "dislike"] },
        },
      },
    ],
  },
});

const PostModel = model("Post", post);

export default PostModel;
