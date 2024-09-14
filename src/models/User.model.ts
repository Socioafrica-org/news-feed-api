import { Schema, model } from "mongoose";
import { TUserModel } from "../utils/types";

const user_details: Schema<TUserModel> = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  password: {
    required: true,
    type: String,
  },
  username: {
    required: true,
    unique: true,
    type: String,
    index: true,
  },
  authenticated: {
    type: Boolean,
    required: true,
  },
  metadata: {
    type: {
      first_name: {
        type: String,
        required: true,
      },
      last_name: {
        type: String,
        required: true,
      },
      phone_number: {
        type: String,
      },
      gender: {
        type: String,
      },
      image: {
        type: String,
      },
    },
  },
});

const UserModel = model("users", user_details);
export default UserModel;
