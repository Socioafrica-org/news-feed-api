import { Router } from "express";
import { validate_token } from "../middlewares/validate-token.middleware";
import { add_remove_reaction } from "../controllers/reaction.controller";

const reaction_routes = Router();

// * validate token middleware for authenticating user token
reaction_routes.put("/", validate_token as any, add_remove_reaction as any);

export default reaction_routes;
