import { Request, Response } from "express";
import { TExtendedRequestTokenData } from "../utils/types";
import notification_model from "../models/Notification.model";

/**
 * * Function responsible for retrieving the notifications pertaining to a user
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const get_notifications = async (
  req: Request<any, any, any, { pagination: number }> &
    TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      token_data: { user_id },
      query: { pagination },
    } = req;

    const limit = 10;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve all notifications relating to a specific user
    const notifications = await notification_model
      .find({ user: user_id })
      .skip(amount_to_skip)
      .limit(limit);

    return res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
