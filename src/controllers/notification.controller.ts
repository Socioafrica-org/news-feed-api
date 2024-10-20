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
      query: { pagination },
    } = req;
    const user_id = req.token_data?.user_id;

    const limit = 10;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve all notifications relating to a specific user
    const notifications = await notification_model
      .find({ user: user_id })
      .populate("initiated_by")
      .skip(amount_to_skip)
      .limit(limit);

    return res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for changing the state of all notifications pertaining to a user to read
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const read_all_notifications = async (
  req: Request & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const user_id = req.token_data?.user_id;

    // * Set all notifications relating to a specific user to read
    await notification_model.updateMany(
      { user: user_id },
      { $set: { read: true } }
    );

    return res.status(200).json("Updated notifications succcessfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for changing the state of a single notification to read
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const read_notification = async (
  req: Request<{ notification_id: string }> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      params: { notification_id },
    } = req;

    // * Set the current notification to read
    await notification_model.findByIdAndUpdate(notification_id, {
      $set: { read: true },
    });

    return res.status(200).json("Updated notification succcessfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
