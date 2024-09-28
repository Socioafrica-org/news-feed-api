import { Router } from "express";
import {
  create_community,
  get_communities,
  join_community,
} from "../controllers/community.controller";
import { validate_token } from "../middlewares/token.middleware";

const community_router = Router();

community_router.use(validate_token as any);

community_router.post("/create", create_community as any);
community_router.post("/get", get_communities as any);
community_router.post("/join", join_community as any);

export default community_router;
