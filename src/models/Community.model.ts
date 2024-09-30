import { model, Schema } from "mongoose";
import { TCommunityModel } from "../utils/types";

const community_schema: Schema<TCommunityModel> = new Schema<TCommunityModel>({
  name: { required: true, type: String },
  description: { required: true, type: String },
  topics: [String],
  image: {
    type: String,
  },
  cover_image: {
    type: String,
  },
  visibility: { required: true, type: String, enum: ["all", "manual"] },
});

const community_model = model("Community", community_schema);

export default community_model;
