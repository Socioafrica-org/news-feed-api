import { Request, Response } from "express";
import { TExtendedRequestTokenData } from "../utils/types";
import PostModel from "../models/Post.model";

export const share_unshare_post = async (
  req: Request<any, any, { post_id: string }> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const user_id = req.token_data?.user_id;

    // * Check if the post to be shared exists in the database
    const original_post = await PostModel.findOne({
      _id: req.body.post_id,
    }).catch((e) => console.error("Error retrieving post to be shared", e));

    // * If post to be shared couldn't be found or an error occured while retrieving the post, return a 404 error
    if (!original_post) {
      console.error(
        "Could not retrieve post to be shared or post doesn't exist"
      );
      return res.status(404).json("Post doesn't exist");
    }

    // * Check if the post has been previously shared by this user
    const existing_post = await PostModel.findOne({
      shared_by: user_id,
      parent_post_id: req.body.post_id,
    }).catch((e) => console.error("Error retrieving the existing post", e));

    // * If an error occured while retrieving the existing post, return a 500 error
    if (existing_post === undefined) {
      console.error("Error retrieving the post");
      return res.status(500).json("Internal server error");
    }

    // * If the post has already been shared by this user, delete it
    if (existing_post) {
      // * Delete the post from the collection
      const deleted_post = await PostModel.deleteMany({
        shared_by: user_id,
        parent_post_id: req.body.post_id,
      }).catch((e) => console.error("Error deleting the existing post", e));

      // * If an error occured while deleting the existing post, return a 500 error
      if (deleted_post === undefined) {
        console.error("Error deleting the post");
        return res.status(500).json("Internal server error");
      }

      return res.status(200).json("Post successfully unshared");
    }

    // * Else if the post hasn't been shared by this user
    // * Create a new post in the post collection based off the post to be shared
    const shared_post = await PostModel.create({
      shared_by: user_id,
      parent_post_id: req.body.post_id,
      date_created: new Date(),
      content: original_post.content,
      reactions: [],
      user: user_id,
      visibility: original_post.visibility,
    }).catch((e) => console.error("Error sharing the post", e));

    // * If an error occured while sharing the post, return a 500 error
    if (!shared_post) {
      console.error("Error sharing the post");
      return res.status(500).json("Internal server error");
    }

    return res.status(201).json("Post shared successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
