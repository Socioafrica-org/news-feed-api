import { Request, Response } from "express";
import { TBookmarkModel, TExtendedRequestTokenData } from "../utils/types";
import BookmarkModel from "../models/Bookmark.model";

export const edit_bookmark = async (
  req: Request<any, any, TBookmarkModel> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const { username } = req.token_data;
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
