import { model, Schema } from "mongoose";
import { TCommentModel } from "../utils/types";

const comment: Schema<TCommentModel> = new Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  parent_comment_id: { type: Schema.Types.ObjectId },
  reply_to: { type: String },
  post_id: { type: Schema.Types.ObjectId, required: true },
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

const CommentModel = model("Comment", comment);

export default CommentModel;
