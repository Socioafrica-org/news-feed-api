import axios from "axios";
import { config } from "dotenv";

config();

export const auth_instance = axios.create({
  baseURL: process.env.AUTH_BACKEND || "",
});
