import { Request, Response } from "express";
import { TExtendedRequestTokenData, TUserModelMetaData } from "../utils/types";
import UserModel from "../models/User.model";
import { compare, hash } from "bcrypt";
import { upload_file_to_cloudinary } from "../utils/utils";

/**
 * * Function responsible for updating the personal information of a user, e.g. email, username, names, passwords, etc...
 * @param req The Express Js reqest object
 * @param res The Express Js response object
 * @returns Void
 */
export const edit_user_personal_info = async (
  req: Request<
    any,
    any,
    TUserModelMetaData & {
      email?: string;
      new_password?: string;
      existing_password?: string;
    }
  > &
    TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      token_data: { user_id },
      body,
    } = req;

    // * Check if the user with the id in the access token, i.e. the user to be updated exists in the collection
    const user_details_to_update = await UserModel.findById(user_id);

    // * If the user doesn't exist, return a 404 error
    if (!user_details_to_update) {
      console.error("User doesn't exist");
      return res.status(404).json("User doesn't exist");
    }

    const username = body.username;
    const email = body.email;
    const existing_password = body.existing_password;
    const new_password = body.new_password;
    const existing_metadata = (user_details_to_update.metadata as any)._doc;

    // * If the username field exists, i.e. user wants to update the username, check if the username exists in the db
    if (username) {
      const username_exists = await UserModel.findOne({ username });

      // * If the username exists, return 500 error
      if (username_exists) {
        console.error(
          `Cannot update user, because username ${username} already exist`
        );
        return res.status(500).json(`Username ${username} already exist`);
      }
    }

    // * If the email field exists, i.e. user wants to update the email address, check if the email exists in the db
    if (email) {
      const email_exists = await UserModel.findOne({ email });

      // * If the username exists, return 500 error
      if (email_exists) {
        console.error(
          `Cannot update user, because email ${email} already exist`
        );
        return res.status(500).json(`Email ${email} already exist`);
      }
    }

    // * If the user wants to change the password, confirm the old password vs the existing password in the database, and ensure that the new password isn't same as the existing password
    if (existing_password || new_password) {
      // * Compare if the old password passed equals that in the database
      const password_verified = await compare(
        existing_password || "",
        user_details_to_update.password
      );

      // * If the old password passed doesn't match the existing password, return 500 error
      if (!password_verified) {
        console.error(
          "Incorrect password: Old password passed doesn't match the existing password"
        );
        return res
          .status(500)
          .json(
            "Incorrect password: Old password passed doesn't match the existing password"
          );
      }

      // * If the password to be created is same as the existing password, return 500 error
      if (existing_password === new_password) {
        console.error("New password must not be same as the existing password");
        return res
          .status(500)
          .json("New password must not be same as the existing password");
      }

      // * If the password to be created is an empty string, return 500 error
      if (new_password?.trim() === "" || !new_password) {
        console.error("New password must not be empty");
        return res.status(500).json("New password must not be empty");
      }
    }

    // * Update the user's username, email, and password conditionally
    const update_username = username ? { username: username } : {};
    const update_email = email ? { email } : {};
    const update_password = new_password
      ? { password: await hash(new_password, 10) }
      : {};

    // * Delete the email, password, and username fields from the object which will be used to update the user's details in the metadata field
    delete body.email;
    delete body.new_password;
    delete body.username;
    delete body.existing_password;
    delete body.image;
    delete body.cover_image;
    delete body.bio;

    // * Update the user details
    const updated_user = await UserModel.findByIdAndUpdate(user_id, {
      $set: {
        ...update_username,
        ...update_email,
        ...update_password,
        metadata: { ...existing_metadata, ...body },
      },
    });

    // * If User not updated, return 500 error
    if (!updated_user) {
      console.error("Could not update user");
      return res
        .status(500)
        .json("An error occurred while updating the user details");
    }

    return res.status(200).json("User updated successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for updating the account information of a user, e.g. cover image, profile image, bio, etc...
 * @param req The Express Js reqest object
 * @param res The Express Js response object
 * @returns Void
 */
export const edit_user_account_info = async (
  req: Request<
    any,
    any,
    {
      cover_image?: string;
      profile_image?: string;
      bio?: string;
    }
  > &
    TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      token_data: { user_id },
      body,
    } = req;

    // * Check if the user with the id in the access token, i.e. the user to be updated exists in the collection
    const user_details_to_update = await UserModel.findById(user_id);

    // * If the user doesn't exist, return a 404 error
    if (!user_details_to_update) {
      console.error("User doesn't exist");
      return res.status(404).json("User doesn't exist");
    }

    // * Retrieve the user's existing metadata from the user details response
    const existing_metadata = (user_details_to_update.metadata as any)._doc;

    // * Extract the cover image from the files parsed by multer
    const cover_image = (
      req.files as unknown as { [fieldname: string]: Express.Multer.File[] }
    )?.cover_image?.[0];
    // * Extract the profile image from the files parsed by multer
    const profile_image = (
      req.files as unknown as { [fieldname: string]: Express.Multer.File[] }
    )?.profile_image?.[0];

    // * The URL of the uploaded cover image
    let cover_image_url = undefined;
    // * The URL of the uploaded profile image
    let profile_image_url = undefined;

    // * If the user uploaded a new cover image
    if (cover_image) {
      // * Upload cover image to cloudinary
      const uploaded_file = await upload_file_to_cloudinary(cover_image, {
        folder: "cover_images",
      }).catch((e) =>
        console.error("Could not upload cover image", cover_image.filename, e)
      );
      // * If cover image couldn't get uploaded, return 500 error
      if (!uploaded_file) {
        console.error("Couldn't upload cover image to cloudinary");
        return res
          .status(500)
          .json("An error was encountered while updating the cover image");
      }
      // * Add the uploaded cover image to the list of uploaded files
      cover_image_url = uploaded_file.url;
    }

    // * If the user uploaded a new profile image
    if (profile_image) {
      // * Upload profile image to cloudinary
      const uploaded_file = await upload_file_to_cloudinary(profile_image, {
        folder: "profile_images",
      }).catch((e) =>
        console.error(
          "Could not upload profile image",
          profile_image.filename,
          e
        )
      );
      // * If profile image couldn't get uploaded, return 500 error
      if (!uploaded_file) {
        console.error("Couldn't upload profile image to cloudinary");
        return res
          .status(500)
          .json("An error was encountered while updating the profile image");
      }
      // * Add the uploaded profile image to the list of uploaded files
      profile_image_url = uploaded_file.url;
    }

    // * Conditionally update the user's cover image, profile image or bio, if the fields were passed.
    const update_cover_image = cover_image_url
      ? { cover_image: cover_image_url }
      : {};
    const update_profile_image = profile_image_url
      ? { image: profile_image_url }
      : {};
    const update_bio = body.bio ? { bio: body.bio } : {};

    // * Update the user details
    const updated_user = await UserModel.findByIdAndUpdate(user_id, {
      $set: {
        metadata: {
          ...existing_metadata,
          ...update_cover_image,
          ...update_profile_image,
          ...update_bio,
        },
      },
    });

    // * If User not updated, return 500 error
    if (!updated_user) {
      console.error("Could not update user");
      return res
        .status(500)
        .json("An error occurred while updating the user details");
    }

    return res.status(200).json("User updated successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
