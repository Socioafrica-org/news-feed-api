import { Request, Response } from "express";
import PostModel from "../models/Post.model";
import {
  parse_comments,
  parse_communities,
  parse_posts,
  parse_users,
} from "../utils/utils";
import { TExtendedRequestTokenData } from "../utils/types";
import CommentModel from "../models/Comment.model";
import UserModel from "../models/User.model";
import community_model from "../models/Community.model";

/**
 * * Function responsible for searching post with certain a substring
 * @param req The Express Js request object
 * @param res The Express Js response object
 */
export const search_posts = async (
  req: Request<any, any, any, { content: string; pagination: number }> &
    TExtendedRequestTokenData,
  res: Response
) => {
  const {
    token_data,
    query: { content, pagination },
  } = req;
  try {
    const limit = 30;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve posts containing the given content using regex
    const posts = await PostModel.find({
      content: { $regex: content || "", $options: "i" },
    })
      .populate("user")
      .skip(amount_to_skip)
      .limit(limit);

    // * Parse the retrieved posts with the user's details, to contain statuses like: reacted to, bookmarked, shared, etc
    const parsed_posts = await parse_posts(posts, token_data?.user_id);

    return res.status(200).json(parsed_posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for searching users whose usernames or fullnames with certain a substring
 * @param req The Express Js request object
 * @param res The Express Js response object
 */
export const search_users = async (
  req: Request<any, any, any, { content: string; pagination: number }> &
    TExtendedRequestTokenData,
  res: Response
) => {
  const {
    query: { content, pagination },
  } = req;
  try {
    const limit = 30;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve users whose usernames, or fullnames contain the given content using regex
    const users = await UserModel.find({
      $or: [
        {
          username: { $regex: content || "", $options: "i" },
        },
        {
          "metadata.first_name": { $regex: content || "", $options: "i" },
        },
        {
          "metadata.last_name": { $regex: content || "", $options: "i" },
        },
      ],
    })
      .skip(amount_to_skip)
      .limit(limit);

    // * Parse the retrieved user to contain the user's metadata, e.g. first and lastnames
    const parsed_users = await parse_users(users);

    return res.status(200).json(parsed_users);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for searching communities which description or names contain the specified content
 * @param req The Express Js request object
 * @param res The Express Js response object
 */
export const search_communities = async (
  req: Request<any, any, any, { content: string; pagination: number }> &
    TExtendedRequestTokenData,
  res: Response
) => {
  const {
    query: { content, pagination },
  } = req;
  try {
    const limit = 30;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve communities which description or names contain the specified content
    const communities = await community_model
      .find({
        $or: [
          {
            name: { $regex: content || "", $options: "i" },
          },
          {
            description: { $regex: content || "", $options: "i" },
          },
        ],
      })
      .skip(amount_to_skip)
      .limit(limit);

    // * Parse the retrieved user to contain the no. of memebrs in the community
    const parsed_communities = await parse_communities(communities);

    return res.status(200).json(parsed_communities);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for searching comments with certain a substring
 * @param req The Express Js request object
 * @param res The Express Js response object
 */
export const search_comments = async (
  req: Request<any, any, any, { content: string; pagination: number }> &
    TExtendedRequestTokenData,
  res: Response
) => {
  const {
    token_data,
    query: { content, pagination },
  } = req;
  try {
    const limit = 30;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve comments containing the given content using regex
    const comments = await CommentModel.find({
      content: { $regex: content || "", $options: "i" },
    })
      .populate("user")
      .skip(amount_to_skip)
      .limit(limit);

    // * Parse the retrieved comments with the user's details, to contain statuses like: reacted to, bookmarked, shared, etc
    const parsed_comments = await parse_comments(comments, token_data?.user_id);

    return res.status(200).json(parsed_comments);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
