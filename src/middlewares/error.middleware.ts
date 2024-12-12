import { NextFunction, Response } from "express";
import { TMetricsRequest } from "../utils/types";

/**
 * * The middleware responsible for handling uncaught errors from each endpoint in the webserver
 * @param error The Express Js error parameter
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @param next The Express Js next function
 */
export const manage_error_middleware = (
  error: any,
  req: TMetricsRequest,
  res: Response,
  next: NextFunction
) => {
  // * Increment the http_request_total metric
  console.error(error);
  return res.status(500).json("Internal server error");
};

/**
 * * The middleware responsible for handling 404 responses in the web server. I.e. when an endpoint doesn't exist
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @param next The Express Js next function
 */
export const manage_404_middleware = (
  req: TMetricsRequest,
  res: Response,
  next: NextFunction
) => {
  // * Increment the http_request_total metric
  next();
};
