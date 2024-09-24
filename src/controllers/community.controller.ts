import { Request, Response } from "express";
import community_model from "../models/Community.model";
import { TExtendedRequestTokenData } from "../utils/types";
import community_member_model from "../models/CommunityMember.model";

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
