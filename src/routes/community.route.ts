import { Router } from "express";
import {
  create_community,
  get_communities,
} from "../controllers/community.controller";
import { validate_token } from "../middlewares/token.middleware";

const community_router = Router();

community_router.use(validate_token as any);

community_router.post(create_community as any);
community_router.post(get_communities as any);

export default community_router;
