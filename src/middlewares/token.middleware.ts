import { NextFunction, Request, Response } from "express";
import { auth_instance } from "../utils/instances";
import { TExtendedRequestTokenData } from "../utils/types";
import { AxiosError, AxiosResponse } from "axios";

// * Middleware to validate the access token passed to the request
export const validate_token = async (
  req: Request & TExtendedRequestTokenData,
  res: Response,
  next: NextFunction
) => {
  try {
    const request_body = {
      cookies: req.cookies,
      headers: req.headers,
    };
    // * Make a request to the auth backend microservice to validate the user's token
    const token_response = await auth_instance
      .post<
        any,
        AxiosResponse<any, { tokens: Record<any, any>; data: Record<any, any> }>
      >("/api/token/validate", request_body)
      .catch((e: AxiosError) => {
        console.error(e.message);

        // * If the request returned an unauthorized error
        if (e.status === 401) {
          console.log("Unauthorized user");
          res.status(401).json("Unauthorized user");
          return;
        }
        // * If the request returned an internal server error
        if (e.status === 500) {
          console.log("An error occured while validating user token");
          res.status(401).json("An error occured while validating user token");
          return;
        }
      });

    if (!token_response) return;

    // * Forward the headers from the auth response to the current response
    for (const header in token_response.headers) {
      // * If the header is that to set a cookie, for the refresh token or the authorixatio header, forward it to the client response headers
      if (
        header == "set-cookie" ||
        header == "authorization" ||
        header == "refresh-token"
      )
        res.setHeader(header, token_response.headers[header]);
    }

    // * Add the parsed token response data to the request
    req.token_data = token_response.data.data;

    // * Proceed to the next step
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json("Invernal server error");
  }
};

// * Middleware to decode the access token passed to the request
export const decode_token = async (
  req: Request & TExtendedRequestTokenData,
  res: Response,
  next: NextFunction
) => {
  try {
    const request_body = {
      cookies: req.cookies,
      headers: req.headers,
    };
    // * Make a request to the auth backend microservice to decode the user's token
    const token_response = await auth_instance.post<
      any,
      AxiosResponse<any, { tokens: Record<any, any>; data: Record<any, any> }>
    >("/api/token/decode", request_body);

    // * Add the parsed token response data to the request
    req.token_data = token_response.data;

    // * Proceed to the next step
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json("Invernal server error");
  }
};
