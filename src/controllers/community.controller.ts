import { Request, Response } from "express";
import community_model from "../models/Community.model";
import { TExtendedRequestTokenData } from "../utils/types";
import community_member_model from "../models/CommunityMember.model";
import PostModel from "../models/Post.model";
import { parse_posts } from "../utils/utils";
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

    // * if no communities were found, return 404 error
    if (communities.length < 1)
      return res.status(404).json("No communities found");

    return res.status(200).json(communities);
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

    if (community_posts.length < 1)
      return res.status(404).json("No posts found");

    // * Parse each post in the list, return their reaction count, comment count, bookmarked state, total no. of times shared, etc...
    const parsed_posts = await parse_posts(community_posts, user_id);

    return res.status(200).json(parsed_posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
