import { model, Schema } from "mongoose";
import { TCommunityMemberModel } from "../utils/types";

const community_member_schema: Schema<TCommunityMemberModel> =
  new Schema<TCommunityMemberModel>({
    user: { required: true, type: Schema.Types.ObjectId, ref: "User" },
    community: {
      required: true,
      type: Schema.Types.ObjectId,
      ref: "Community",
    },
    role: {
      required: true,
      type: String,
      enum: ["super_admin", "admin", "member"],
    },
  });

const community_member_model = model(
  "CommunityMember",
  community_member_schema
);

export default community_member_model;
