import { Request, Response } from "express";
import PostModel from "../models/Post.model";
import { parse_comments, parse_posts } from "../utils/utils";
import { TExtendedRequestTokenData } from "../utils/types";
import CommentModel from "../models/Comment.model";

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
    const limit = 10;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve posts containing the given content using regex
    const posts = await PostModel.find({
      content: { $regex: content, $options: "i" },
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
    const limit = 10;
    const amount_to_skip = (pagination - 1) * limit;

    // * Retrieve comments containing the given content using regex
    const comments = await CommentModel.find({
      content: { $regex: content, $options: "i" },
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
