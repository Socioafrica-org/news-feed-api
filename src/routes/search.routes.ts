import { Router } from "express";
import {
  search_comments,
  search_communities,
  search_posts,
  search_users,
} from "../controllers/search.controller";
import { decode_token } from "../middlewares/token.middleware";

const search_router = Router();

// * The decode_token middleware below retrieved the user details from the token
search_router.use(decode_token as any);

search_router.get("/posts", search_posts as any);
search_router.get("/comments", search_comments as any);
search_router.get("/users", search_users as any);
search_router.get("/communities", search_communities as any);

export default search_router;
