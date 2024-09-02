import { model, Schema } from "mongoose";
import { TPostModel } from "../utils/types";

const post: Schema<TPostModel> = new Schema({
  content: { required: true, type: String },
  file_urls: { type: [String] },
  username: { required: true, type: String },
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
  date_created: { required: true, type: Date },
  reactions: {
    required: true,
    type: [
      {
        username: String,
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
