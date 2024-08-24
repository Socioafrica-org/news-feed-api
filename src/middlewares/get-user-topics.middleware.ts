import { NextFunction, Request, Response } from "express";

/**
 * * Middleware responsible for retrieving the user topics for the get post endpoint, so posts can be retrieved according to the topics a user selected upon sign up
 * @param req the express js request object
 * @param res The express js response object
 * @param next The express js next function
 */
export const get_user_topics = (
  req: Request & { topics: string[] },
  res: Response,
  next: NextFunction
) => {
  req.topics = req.body.topics;
  next();
};
