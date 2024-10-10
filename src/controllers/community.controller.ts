import { Request, Response } from "express";
import community_model from "../models/Community.model";
import { TCommunityResponse, TExtendedRequestTokenData } from "../utils/types";
import community_member_model from "../models/CommunityMember.model";
import PostModel from "../models/Post.model";
import { parse_posts, upload_file_to_cloudinary } from "../utils/utils";
import { Types } from "mongoose";

/**
 * * Function responsible for creating a new community and adding its creator as the community super admin
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const create_community = async (
  req: Request<
    any,
    any,
    {
      name: string;
      description: string;
      visibility: "all" | "manual";
      topics: string[];
    }
  > &
    TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      token_data: { user_id },
      body: { name, description, visibility, topics },
    } = req;

    // * Creates a new community in the database
    const created_community = await community_model.create({
      name,
      description,
      visibility,
      ...(topics ? { topics } : {}),
    });

    // * Add this user as a member (super_admin) of this community
    const added_community_member = await community_member_model
      .create({
        user: user_id,
        community: created_community._id,
        role: "super_admin",
      })
      .catch((e) => {
        console.log(e);
      });

    // * If there was an error while adding this user as a member of this community, delete the created community
    if (!added_community_member) {
      await community_model.findByIdAndDelete(created_community._id);
      return res.status(500).json("Internal server error");
    }

    return res.status(201).json("Community created successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for creating a new community and adding its creator as the community super admin
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const edit_community = async (
  req: Request<
    { community_id: string },
    any,
    {
      name: string;
      description: string;
      visibility: "all" | "manual";
      topics: string[];
    }
  > &
    TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      token_data: { user_id },
      params: { community_id },
      body,
    } = req;

    // * Confirming the community exists
    const community_exists = await community_model.findById(community_id);

    // * If the community doesn't exist, return 404 error
    if (!community_exists) {
      console.error("Community does not exist");
      return res.status(404).json("Community doesn't exist");
    }

    // * Check if the user is an admin/the creator of this community
    const is_admin = await community_member_model.findOne({
      user: user_id,
      community: community_id,
      $or: [{ role: "super_admin" }, { role: "admin" }],
    });

    // * If the user isn't an admin/the creator of this community, return a 403 error
    if (!is_admin) {
      console.error(
        "User needs to be an admin of this community to edit it's details"
      );
      return res
        .status(403)
        .json(
          "User needs to be an admin of this community to edit it's details"
        );
    }

    // * Extract the cover image from the files parsed by multer
    const cover_image = (
      req.files as unknown as { [fieldname: string]: Express.Multer.File[] }
    )?.cover_image?.[0];
    // * Extract the profile image from the files parsed by multer
    const image = (
      req.files as unknown as { [fieldname: string]: Express.Multer.File[] }
    )?.image?.[0];

    // * The URL of the uploaded cover image
    let cover_image_url = undefined;
    // * The URL of the uploaded image
    let image_url = undefined;

    // * If the community admin/super admin uploaded a new cover image
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

    // * If the community admin/super admin uploaded a new image
    if (image) {
      // * Upload profile image to cloudinary
      const uploaded_file = await upload_file_to_cloudinary(image, {
        folder: "community_images",
      }).catch((e) =>
        console.error("Could not upload profile image", image.filename, e)
      );
      // * If image couldn't get uploaded, return 500 error
      if (!uploaded_file) {
        console.error("Couldn't upload image to cloudinary");
        return res
          .status(500)
          .json("An error was encountered while updating the profile image");
      }
      // * Add the uploaded profile image to the list of uploaded files
      image_url = uploaded_file.url;
    }

    // * Conditionally update the community's cover image, or image if the fields were passed.
    const update_cover_image = cover_image_url
      ? { cover_image: cover_image_url }
      : {};
    const update_image = image_url ? { image: image_url } : {};

    // * Parse the topics array in the body if it was passed and the content type is of 'multipart/formdata'
    if (typeof body.topics === "string") {
      const topic_string = body.topics;
      body.topics = JSON.parse(topic_string);
    }

    // * Update the community details
    const updated_community = await community_model.findByIdAndUpdate(
      community_id,
      {
        $set: {
          ...body,
          ...update_cover_image,
          ...update_image,
        },
      }
    );

    // * If there was an error while updating the community details, return 500 error
    if (!updated_community) {
      console.error("An error occurred while updating the community details");
      return res
        .status(500)
        .json("An error occurred while updating the community details");
    }

    return res.status(200).json("Community updated successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for retrieving the list of communities on the platform
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const get_communities = async (
  req: Request<any, any, { pagination: number; topics: string[] }>,
  res: Response
) => {
  try {
    const {
      body: { pagination, topics },
    } = req;

    const limit = 10;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve all communities, or those with specific topics from the database in batches of 10
    const communities = await community_model
      .find(topics ? { topics: { $in: topics } } : {})
      .skip(amount_to_skip)
      .limit(limit);

    const parsed_communities: TCommunityResponse[] = [];

    // * Loop through each community in the list of retrieved communities, and add the no. of members in each community
    for (const community of communities) {
      // * Retrieve the no. of members in this community
      const members_count = await community_member_model.countDocuments({
        community: community._id,
      });
      const parsed_community: TCommunityResponse = {
        ...(community as any)._doc,
        members_count,
      };
      // * Add the parsed community to the list of parsed communities
      parsed_communities.push(parsed_community);
    }

    return res.status(200).json(parsed_communities);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for adding a user to a community
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const join_community = async (
  req: Request<any, any, { community_id: string }> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      token_data: { user_id },
      body: { community_id },
    } = req;

    // * Check if this user has previously joined the community
    const is_member = await community_member_model.findOne({
      user: user_id,
      community: community_id,
    });

    // * If the user is already a member, return 500 error
    if (is_member) {
      // * If this user if the creator of this community, return 500
      if (is_member.role === "super_admin") {
        console.error(
          "This user is the creator of this community, it cannot leave"
        );
        return res
          .status(500)
          .json("This user is the creator of this community, it cannot leave");
      }

      // * Remove this user from the list of this community members
      await community_member_model.deleteOne({
        user: user_id,
        community: community_id,
      });

      return res.status(200).json("User left community successfully");
    }

    // * Add this user as a member (member) of this community
    await community_member_model.create({
      user: user_id,
      community: community_id,
      role: "member",
    });

    return res.status(201).json("User joined community successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for retrieving the list of posts created in a community
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const get_community_posts = async (
  req: Request<{ community_id: string }, any, any, { pagination: number }> &
    TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      params: { community_id },
      query: { pagination },
      token_data: { user_id },
    } = req;

    const limit = 10;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve the posts created within with the community
    const community_posts = await PostModel.find({
      "visibility.mode": "community",
      "visibility.community_id": new Types.ObjectId(community_id),
    })
      .populate("user")
      .sort({ date_created: -1 })
      .skip(amount_to_skip)
      .limit(limit);

    // * Parse each post in the list, return their reaction count, comment count, bookmarked state, total no. of times shared, etc...
    const parsed_posts = await parse_posts(community_posts, user_id);

    return res.status(200).json(parsed_posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for retrieving the details concerning a community
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const get_community = async (
  req: Request<{ community_id: string }> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const {
      params: { community_id },
      token_data: { user_id },
    } = req;

    // * Retrieve the details concerning a community
    const community = await community_model.findById(community_id);

    // * If the community doesn't exist, return 404 error
    if (!community) {
      return res.status(404).json("This community doesn't exist");
    }

    // * Check if this user is a member of this commmunity
    const is_member = await community_member_model.findOne({
      user: user_id,
      community: community_id,
    });

    // * Retrieve the count of the members of this community
    const members_count = await community_member_model.countDocuments({
      community: community_id,
    });

    const response_body: TCommunityResponse = {
      image: null,
      cover_image: null,
      ...(community as any)._doc,
      is_member: is_member ? true : false,
      is_admin:
        is_member?.role === "super_admin" || is_member?.role === "admin"
          ? true
          : false,
      members_count,
    };

    return res.status(200).json(response_body);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
