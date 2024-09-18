import { model, Schema } from "mongoose";
import { TFollowerModel } from "../utils/types";

const follower_schema: Schema<TFollowerModel> = new Schema<TFollowerModel>({
  user: { required: true, type: Schema.Types.ObjectId, ref: "User" },
  following: { required: true, type: Schema.Types.ObjectId, ref: "User" },
});

const follower_model = model("Follower", follower_schema);

export default follower_model;
