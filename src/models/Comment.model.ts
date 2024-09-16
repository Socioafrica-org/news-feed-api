import { model, Schema } from "mongoose";
import { TCommentModel } from "../utils/types";

const comment: Schema<TCommentModel> = new Schema({
  user: { required: true, type: Schema.Types.ObjectId, ref: "User" },
  content: { type: String, required: true },
  parent_comment_id: { type: Schema.Types.ObjectId },
  reply_to: { type: String },
  post_id: { type: Schema.Types.ObjectId, required: true },
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

const CommentModel = model("Comment", comment);

export default CommentModel;
