import { Router } from "express";
import { validate_token } from "../middlewares/token.middleware";
import { add_remove_reaction } from "../controllers/reaction.controller";

const reaction_router = Router();

// * validate token middleware for authenticating user token
reaction_router.put("/", validate_token as any, add_remove_reaction as any);

export default reaction_router;
