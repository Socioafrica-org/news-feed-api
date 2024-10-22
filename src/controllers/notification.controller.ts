import { Request, Response } from "express";
import {
  TExtendedRequestTokenData,
  TNotificationModel,
  TUserModel,
  TUserModelMetaData,
} from "../utils/types";
import notification_model from "../models/Notification.model";
import { transform_user_details } from "../utils/utils";

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

    const parsed_notifications: (Omit<TNotificationModel, "initiated_by"> & {
      initiated_by: TUserModelMetaData;
      url: string;
    })[] = [];

    // * loop through the notifications and parse the user information
    for (const notification of notifications) {
      // * Transform the user data retrieving only it's metadata
      const initiated_by = transform_user_details(
        notification.initiated_by as any as TUserModel
      ) as TUserModelMetaData;

      // * Add the parsed user's object to the list of notifications to be returned
      parsed_notifications.push({
        ...(notification as any)._doc,
        initiated_by,
        url: `https://socio.africa/${
          notification.ref.mode === "follow" ? "profile" : "post"
        }/${
          ["comment", "react"].includes(notification.ref.mode)
            ? notification.ref.post_id
            : notification.ref.ref_id
        }/${
          ["comment", "react"].includes(notification.ref.mode)
            ? `#${notification.ref.ref_id}`
            : ""
        }`,
      });
    }

    return res.status(200).json(parsed_notifications);
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
