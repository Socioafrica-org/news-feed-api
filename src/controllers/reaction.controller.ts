import { Request, Response } from "express";
import {
  TCommentReaction,
  TExtendedRequestTokenData,
  TPostReaction,
  TReactionRequestBody,
} from "../utils/types";
import PostModel from "../models/Post.model";
import CommentModel from "../models/Comment.model";

/**
 * * Function responsible for adding or removing a reaction to a post or comment
 * @param req The express request object
 * @param res The Express Js response object
 * @returns void
 */
export const add_remove_reaction = async (
  req: Request<any, any, TReactionRequestBody> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const { username } = req.token_data;

    // * Check if the item to react to is a post or a comment
    // * If the item to react to is a post
    if (req.body.post_id) {
      const { post_id, reaction } = req.body;
      // * retrieve post with specified id from the collection
      const post = await PostModel.findOne({ _id: post_id }).catch((e) =>
        console.error("Could not retrieve post from collection", e)
      );

      // * If there was an error retrieving the post
      if (!post) {
        console.log("Could not retrieve post from the database");
        return res.status(404).json("Post doesn't exist");
      }

      // * Check if a reaction of this type and username exists in this post
      const existing_reaction = post.reactions.find(
        (rxn) => rxn.username === username && rxn.reaction === reaction
      );

      // * If it does, remove it from the list of the reactions on this post, and update the database
      if (existing_reaction) {
        const new_reactions = [
          ...((post as any)._doc.reactions as TPostReaction[]),
        ].filter(
          (rxn) => rxn.username !== username && rxn.reaction !== reaction
        );

        const unreact_to_post = await PostModel.updateOne(
          { _id: post_id },
          { $set: { reactions: new_reactions } }
        ).catch((e) => console.error("Could not unreact to this post", e));

        // * If there was an error unreacting to the post
        if (!unreact_to_post) {
          console.log("Could not unreact to this post");
          return res.status(500).json("Could not unreact to this post");
        }

        return res.status(200).json("Successfully unreacted to the post");
      }

      // * else, add a new reaction to the list of the post reactions
      const react_to_post_res = await PostModel.updateOne(
        { _id: post_id },
        { $push: { reactions: { username, reaction } } }
      ).catch((e) => console.error("Could not react to this post", e));

      // * If there was an error reacting to the post
      if (!react_to_post_res) {
        console.log("Could not react to this post");
        return res.status(500).json("Could not react to this post");
      }

      return res.status(200).json("Successfully reacted to the post");
    }
    // * If the item to react to is a comment
    if (req.body.comment_id) {
      const { comment_id, reaction } = req.body;
      // * retrieve comment with specified id from the collection
      const comment = await CommentModel.findOne({ _id: comment_id }).catch(
        (e) => console.error("Could not retrieve comment from collection", e)
      );

      // * If there was an error retrieving the comment
      if (!comment) {
        console.log("Could not retrieve comment from the database");
        return res.status(404).json("Comment doesn't exist");
      }

      // * Check if a reaction of this type and username exists in this comment
      const existing_reaction = comment.reactions.find(
        (rxn) => rxn.username === username && rxn.reaction === reaction
      );

      // * If it does, remove it from the list of the reactions on this comment, and update the database
      if (existing_reaction) {
        const new_reactions = [
          ...((comment as any)._doc.reactions as TCommentReaction[]),
        ].filter(
          (rxn) => rxn.username !== username && rxn.reaction !== reaction
        );

        const unreact_to_comment = await CommentModel.updateOne(
          { _id: comment_id },
          { $set: { reactions: new_reactions } }
        ).catch((e) => console.error("Could not unreact to this comment", e));

        // * If there was an error unreacting to the comment
        if (!unreact_to_comment) {
          console.log("Could not unreact to this comment");
          return res.status(500).json("Could not unreact to this comment");
        }

        return res.status(200).json("Successfully unreacted to the comment");
      }

      // * else, add a new reaction to the list of the comment reactions
      const react_to_comment_res = await CommentModel.updateOne(
        { _id: comment_id },
        { $push: { reactions: { username, reaction } } }
      ).catch((e) => console.error("Could not react to this comment", e));

      // * If there was an error reacting to the comment
      if (!react_to_comment_res) {
        console.log("Could not react to this comment");
        return res.status(500).json("Could not react to this comment");
      }

      return res.status(200).json("Successfully reacted to the comment");
    }

    return res.status(201).json("Comment created successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
