import { Request, Response } from "express";
import { TBookmarkModel, TExtendedRequestTokenData } from "../utils/types";
import BookmarkModel from "../models/Bookmark.model";
import PostModel from "../models/Post.model";
import CommentModel from "../models/Comment.model";

export const edit_bookmark = async (
  req: Request<any, any, TBookmarkModel> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const { username } = req.token_data;

    // * If the item to be bookmarked is a post, check if it exists
    if (req.body.post_id) {
      // * Check if the post to be bookmarked exists in the database
      const existing_post = await PostModel.findOne({
        _id: req.body.post_id,
      }).catch((e) =>
        console.error("Error retrieving post to be bookmarked", e)
      );

      // * If post to be bookmarked could'nt be found or an error occured while retrieving the post, return a 404 error
      if (!existing_post) {
        console.error(
          "Could not retrieve post to be bookmarked or post doesn't exist"
        );
        return res.status(404).json("Post doesn't exist");
      }
    }

    // * If the item to be bookmarked is a comment, check if it exists
    else if (req.body.comment_id) {
      // * Check if the comment to be bookmarked exists in the database
      const existing_comment = await CommentModel.findOne({
        _id: req.body.comment_id,
      }).catch((e) =>
        console.error("Error retrieving comment to be bookmarked", e)
      );

      // * If comment to be bookmarked could'nt be found or an error occured while retrieving the comment, return a 404 error
      if (!existing_comment) {
        console.error(
          "Could not retrieve comment to be bookmarked or comment doesn't exist"
        );
        return res.status(404).json("Comment doesn't exist");
      }
    }

    // * Check if an existing bookmark of this post/comment and username exists in the collection
    const existing_bookmark = await BookmarkModel.findOne({
      username,
      ...(req.body.post_id
        ? { post_id: req.body.post_id }
        : req.body.comment_id
        ? { comment_id: req.body.comment_id }
        : {}),
    }).catch((e) => console.error("Error retrieving the bookmark", e));

    // * If an error occured while retrieving the existing bookmark, return a 500 error
    if (existing_bookmark === undefined) {
      console.error("Error retrieving the bookmark");
      return res.status(500).json("Internal server error");
    }

    // * If the bookmak already exists, delete it
    if (existing_bookmark) {
      // * Delete the bookmark from the collection
      const deleted_bookmark = await BookmarkModel.deleteOne({
        username,
        ...(req.body.post_id
          ? { post_id: req.body.post_id }
          : req.body.comment_id
          ? { comment_id: req.body.comment_id }
          : {}),
      }).catch((e) => console.error("Error deleting the existing bookmark", e));

      // * If an error occured while deleting the existing bookmark, return a 500 error
      if (deleted_bookmark === undefined) {
        console.error("Error deleting the  bookmark");
        return res.status(500).json("Internal server error");
      }

      return res.status(200).json("Bookmark successfully removed");
    }

    // * Else if the bookmark doesn't exist create it

    // * Create a new bookmark in the database
    const created_bookmark = await BookmarkModel.create({
      username,
      post_id: req.body.post_id,
      comment_id: req.body.comment_id,
    }).catch((e) => console.error("Error creating the bookmark", e));

    // * If an error occured while creating the existing bookmark, return a 500 error
    if (!created_bookmark) {
      console.error("Error creating the bookmark");
      return res.status(500).json("Internal server error");
    }

    return res.status(201).json("Bookmark created successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

export const get_user_bookmarks = async (
  req: Request & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const { username } = req.token_data;

    // * Retrieve the list of existing bookmarks in the Topics collection
    const bookmarks = await BookmarkModel.find({ username }).catch((e) =>
      console.error("ERROR RETRIEVING THE BOOKMARKED ITEMS", e)
    );

    if (!bookmarks) {
      console.error("Could not retrieve bookmarks");
      return res.status(500).json("Could not retrieve bookmarked items");
    }

    return res.status(200).json(bookmarks);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
