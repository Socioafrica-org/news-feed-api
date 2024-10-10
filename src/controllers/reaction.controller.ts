import { Request, Response } from "express";
import {
  TCommentReaction,
  TExtendedRequestTokenData,
  TPostReaction,
  TReactionRequestBody,
} from "../utils/types";
import PostModel from "../models/Post.model";
import CommentModel from "../models/Comment.model";
import { Model, Types } from "mongoose";
import { create_notification, get_current_user } from "../utils/utils";

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
    const { user_id } = req.token_data;

    // * Retrieve the user who sent this request, i.e. the user to who is reacting this post/comment
    const current_user = await get_current_user(user_id);

    // * Check if the item to react to is a post or a comment
    // * If the item to react to is a post
    if (req.body.post_id) {
      const { post_id, reaction } = req.body;
      // * retrieve post with specified id from the collection
      const post = await PostModel.findById(post_id).catch((e) =>
        console.error("Could not retrieve post from collection", e)
      );

      // * If there was an error retrieving the post
      if (!post) {
        console.log("Could not retrieve post from the database");
        return res.status(404).json("Post doesn't exist");
      }

      // * Check if a reaction of this type and user_id exists in this post
      const existing_reaction = post.reactions.find(
        (rxn) => rxn.user.toString() === user_id && rxn.reaction === reaction
      );

      // * If it does, remove it from the list of the reactions on this post, and update the database
      if (existing_reaction) {
        const new_reactions = [
          ...((post as any)._doc.reactions as TPostReaction[]),
        ].filter(
          (rxn) => rxn.user.toString() !== user_id && rxn.reaction !== reaction
        );

        const unreact_to_post = await PostModel.findByIdAndUpdate(post_id, {
          $set: { reactions: new_reactions },
        }).catch((e) => console.error("Could not unreact to this post", e));

        // * If there was an error unreacting to the post
        if (!unreact_to_post) {
          console.log("Could not unreact to this post");
          return res.status(500).json("Could not unreact to this post");
        }

        return res.status(200).json("Successfully unreacted to the post");
      }

      // * else, add a new reaction to the list of the post reactions
      const react_to_post_res = await PostModel.findByIdAndUpdate(post_id, {
        $push: { reactions: { user: user_id, reaction } },
      }).catch((e) => console.error("Could not react to this post", e));

      // * If there was an error reacting to the post
      if (!react_to_post_res) {
        console.log("Could not react to this post");
        return res.status(500).json("Could not react to this post");
      }

      // * If the added reaction is a like, remove the dislike reaction by this user and vise versa
      await PostModel.findByIdAndUpdate(post_id, {
        $pull: {
          reactions: {
            user: user_id,
            reaction:
              reaction === "like"
                ? "dislike"
                : reaction === "dislike"
                ? "like"
                : "",
          },
        },
      });

      // * Notify the user who created the post which was reacted on
      await create_notification({
        user: post.user?.toString(),
        initiated_by: current_user?._id?.toString(),
        content: `${current_user?.metadata?.first_name} ${current_user?.metadata?.first_name} reacted to your post`,
        ref: {
          mode: "react",
          ref_id: post._id,
        },
      });

      return res.status(200).json("Successfully reacted to the post");
    }
    // * If the item to react to is a comment
    if (req.body.comment_id) {
      const { comment_id, reaction } = req.body;
      // * retrieve comment with specified id from the collection
      const comment = await CommentModel.findById(comment_id).catch((e) =>
        console.error("Could not retrieve comment from collection", e)
      );

      // * If there was an error retrieving the comment
      if (!comment) {
        console.log("Could not retrieve comment from the database");
        return res.status(404).json("Comment doesn't exist");
      }

      // * Check if a reaction of this type and user_id exists in this comment
      const existing_reaction = comment.reactions.find(
        (rxn) => rxn.user.toString() === user_id && rxn.reaction === reaction
      );

      // * If it does, remove it from the list of the reactions on this comment, and update the database
      if (existing_reaction) {
        const new_reactions = [
          ...((comment as any)._doc.reactions as TCommentReaction[]),
        ].filter(
          (rxn) => rxn.user.toString() !== user_id && rxn.reaction !== reaction
        );

        const unreact_to_comment = await CommentModel.findByIdAndUpdate(
          comment_id,
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
      const react_to_comment_res = await CommentModel.findByIdAndUpdate(
        comment_id,
        { $push: { reactions: { user: user_id, reaction } } }
      ).catch((e) => console.error("Could not react to this comment", e));

      // * If there was an error reacting to the comment
      if (!react_to_comment_res) {
        console.log("Could not react to this comment");
        return res.status(500).json("Could not react to this comment");
      }

      // * If the added reaction is a like, remove the dislike reaction by this user and vise versa
      await CommentModel.findByIdAndUpdate(comment_id, {
        $pull: {
          reactions: {
            user: user_id,
            reaction:
              reaction === "like"
                ? "dislike"
                : reaction === "dislike"
                ? "like"
                : "",
          },
        },
      });

      // * Notify the user who created the comment which was reacted on
      await create_notification({
        user: comment.user?.toString(),
        initiated_by: current_user?._id?.toString(),
        content: `${current_user?.metadata?.first_name} ${current_user?.metadata?.first_name} reacted to your comment`,
        ref: {
          mode: "react",
          ref_id: comment._id,
          post_id: comment.post_id as unknown as Types.ObjectId
        },
      });

      return res.status(200).json("Successfully reacted to the comment");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
