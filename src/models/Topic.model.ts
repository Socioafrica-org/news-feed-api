import { model, Schema } from "mongoose";
import { TTopicModel } from "../utils/types";

const topic: Schema<TTopicModel> = new Schema({
  topic_ref: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});

const TopicModel = model("Topics", topic);

export default TopicModel;
