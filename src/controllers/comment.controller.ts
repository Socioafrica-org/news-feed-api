import { Request, Response } from "express";
import {
  TCommentModel,
  TCommentResponse,
  TExtendedRequestTokenData,
} from "../utils/types";
import CommentModel from "../models/Comment.model";
import PostModel from "../models/Post.model";
import { parse_comment } from "../utils/utils";

/**
 * * Function responsible for creating a new comment in a post, i.e. adding a new comment to a post
 * @param req The express request object
 * @param res The Express Js response object
 * @returns void
 */
export const create_comment = async (
  req: Request<any, any, TCommentModel> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const { user_id } = req.token_data;
    // * Validate if the post exists
    const post = await PostModel.findOne({ _id: req.body.post_id }).catch((e) =>
      console.error("Could not retreive parent post", e)
    );

    if (!post) {
      console.error("Could not retreive parent post");
      return res.status(404).json("Could not retreive parent post");
    }

    req.body.reactions = [];
    // * Add the new comment to the comment collection
    const created_comment = await CommentModel.create({
      ...req.body,
      user: user_id,
      date_created: new Date(),
      reactions: [],
    }).catch((e) => console.error("Could not create comment", e));
    //  * If the comment couldn't be created
    if (!created_comment) {
      console.error("Could not create comment");
      return res.status(500).json("Could not create comment");
    }

    return res.status(201).json("Comment created successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for updating an existing comment in a post, i.e. editing a comment in a post
 * @param req The express request object
 * @param res The Express Js response object
 * @returns void
 */
export const edit_comment = async (
  req: Request<{ comment_id: string }, any, TCommentModel> &
    TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const { comment_id } = req.params;
    const { content } = req.body;

    // * Update comment to the comment collection
    const created_comment = await CommentModel.updateOne(
      { _id: comment_id },
      { $set: { content } }
    ).catch((e) => console.error("Could not update comment", e));
    //  * If the comment couldn't be created
    if (!created_comment) {
      console.error("Could not update comment");
      return res.status(500).json("Could not update comment");
    }

    return res.status(200).json("Comment updated successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for retreiving a comment and all it's replies in a post
 * @param req The express request object
 * @param res The Express Js response object
 * @returns void
 */
export const get_comment = async (
  req: Request<{ comment_id: string }, any, TCommentModel> &
    TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const { user_id } = req.token_data;
    const { comment_id } = req.params;

    // * Retreive comment from the comment collection
    const comment_response = await CommentModel.findOne({
      _id: comment_id,
    })
      .populate("user")
      .catch((e) => console.error("Could not retreive comment", e));

    //  * If the comment couldn't be retreived
    if (!comment_response) {
      console.error("Could not retreive comment");
      return res.status(500).json("Could not retreive comment");
    }

    // * Retreive other comments in the collection with the same post id as this one and has this comment id as their object id
    const replies_response = await CommentModel.find({
      post_id: comment_response.post_id,
      parent_comment_id: comment_response._id,
    })
      .populate("user")
      .catch((e) => console.error("Could not retreive replies to comment", e));

    //  * If the comment replies couldn't be retreived
    if (!replies_response) {
      console.error("Could not retreive replies to comment");
      return res.status(500).json("Could not retreive replies to comment");
    }

    // * Parse the comment data retrieved from the collection, adding properties such as like/dislike count
    const parsed_comment = await parse_comment(comment_response, user_id);

    // * A list containing the parsed replies of the comment
    const parsed_replies: TCommentResponse[] = [];

    // * Loop trhough the replies list and parse each reply, adding properties such as like/dislike count
    for (const reply of replies_response) {
      const parsed_reply = await parse_comment(reply, user_id);

      // * Append the parsed reply to the list of parsed replies
      parsed_replies.push(parsed_reply);
    }

    // * Add the list of the parsed replies to the parsed comment response body
    parsed_comment.replies = parsed_replies;

    return res.status(200).json(parsed_comment);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
