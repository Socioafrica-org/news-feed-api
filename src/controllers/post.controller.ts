import { Request, Response } from "express";
import {
  TCommentResponse,
  TCreatePostRequestBody,
  TExtendedRequestTokenData,
  TFetchPostRequestBody,
  TPostResponse,
} from "../utils/types";
import { upload_file_to_cloudinary } from "../utils/utils";
import PostModel from "../models/Post.model";
import CommentModel from "../models/Comment.model";

/**
 * * Function responsible for creating a post
 * @param req The Express Js request object
 * @param res The Express Js response object
 */
export const create_post = async (
  req: Request<any, any, TCreatePostRequestBody> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const { username } = req.token_data;
    const { visibility, content, topics } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];
    const uploaded_files_urls: string[] = [];

    // * Loop though all the uploaded files, and upload each to Cloudinary
    for (const file of files) {
      // * Upload file to cloudinary
      const uploaded_file = await upload_file_to_cloudinary(file, {
        folder: "post_images",
      }).catch((e) => console.error("Could not upload file", file.filename, e));
      // * If file couldn't get uploaded, skip this loop
      if (!uploaded_file) {
        console.error("Couldn't upload file to cloudinary");
        continue;
      }
      // * Add the uploaded file to the list of uploaded files
      uploaded_files_urls.push(uploaded_file.url);
    }

    // * Create a new post object in the post collection
    const created_post = await PostModel.create({
      visibility,
      content,
      username,
      topics,
      file_urls: uploaded_files_urls,
      date_created: new Date(),
      reactions: [],
    }).catch((e) =>
      console.error("Could not add the post to the collection", e)
    );

    if (!created_post) {
      console.error("Could not add the post to the collection");
      return res.status(500).json("Could not add the post to the collection");
    }

    return res.status(201).json("Post created successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for retreiving a post
 * @param req The Express Js request object
 * @param res The Express Js response object
 */
export const get_post = async (
  req: Request<{ post_id: string }, any>,
  res: Response
) => {
  try {
    const { post_id } = req.params;
    // * Retrieve post from the posts collection via it's ID
    const post_response = await PostModel.findOne({ _id: post_id }).catch((e) =>
      console.error("Could not retreive post", e)
    );
    // * If error retrieving post
    if (post_response === undefined) {
      console.error("Could not retreive post");
      return res.status(500).json("Could not retreive post");
    }
    // * If post not found
    if (post_response === null) {
      return res.status(404).json("Post not found");
    }

    // * Retrieve all comments belonging to a post
    const comment_response = await CommentModel.find({
      post_id: post_response._id,
    }).catch((e) => console.error("Could not retreive comments", e));
    // * If the post comments could not be retrieved
    if (!comment_response) {
      console.error("Could not retreive post comments");
      return res.status(500).json("Could not retreive post comments");
    }

    // * Loops through the comment response to filter parent comments from child comments/replies, and adds replies to each parent comment
    const comments = comment_response
      // * Filters out replies, i.e. returns only parent comments
      .filter((comment) => comment.parent_comment_id === undefined)
      // * loops though each parent comment and adds children comments (all comments in the post with it's id as their parent id) as its replies
      .map<TCommentResponse>((comment) => {
        return {
          ...(comment as any)._doc,
          // * Filters all comments in the post which has their parent id as the id of the current comment
          replies: comment_response.filter(
            (reply) =>
              reply.parent_comment_id?.toString() === comment._id.toString()
          ),
        };
      });

    // * Add the returned post and its comments to the response object
    const post: TPostResponse = { ...(post_response as any)._doc, comments };

    return res.status(200).json(post);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * Function responsible for retreiving all posts relating to specific topics from the collection
 * @param req The Express Js request object
 * @param res The Express Js response object
 */
export const get_posts = async (
  req: Request<any, any, TFetchPostRequestBody> & {
    topics?: string[] | undefined;
  },
  res: Response
) => {
  const { pagination } = req.body;
  const limit = 10;
  const amount_to_skip = (pagination - 1) * limit;
  try {
    // * If it was specified to retrieve posts by the topics relating to the user
    if (req.topics) {
      // * Get posts from the collection which are visible to all users, and belong to at least one of the topics specified, in batches of 10 according to the current pagination
      const posts_belonging_to_topics = await PostModel.find({
        topics: { $in: req.topics },
        "visibility.mode": "all",
      })
        .sort({ date_created: -1 })
        .skip(amount_to_skip)
        .limit(limit)
        .catch((e) =>
          console.error("An error occured while retreiving the posts", e)
        );
      // * If there was an error retrieving the posts
      if (!posts_belonging_to_topics) {
        console.error("An error occured while retreiving the posts");
        return res
          .status(500)
          .json("An error occured while retreiving the posts");
      }
      // * If there isn't any post relating to specified topics in the collection
      if (posts_belonging_to_topics.length < 1) {
        // * Get posts from the collection which are visible to all users, and DOESN'T belong to ANY topic, in batches of 10 according to the current pagination
        const posts_not_belonging_to_topics = await PostModel.find({
          topics: { $size: 0 },
          "visibility.mode": "all",
        })
          .sort({ date_created: -1 })
          .skip(amount_to_skip)
          .limit(limit)
          .catch((e) =>
            console.error("An error occured while retreiving the posts", e)
          );
        // * If there was an error retrieving the posts
        if (!posts_not_belonging_to_topics) {
          console.error("An error occured while retreiving the posts");
          return res
            .status(500)
            .json("An error occured while retreiving the posts");
        }
        // * If there isn't any post relating to no topic in the collection
        if (posts_not_belonging_to_topics.length < 1)
          return res.status(404).json("No posts available");

        // * Return the posts with no topic
        return res.status(200).json(posts_not_belonging_to_topics);
      }

      // * Return the posts with the specified topics
      return res.status(200).json(posts_belonging_to_topics);
    }

    // * If it wasn't specifed to retreive posts according to any topic
    // * Get all posts from the collection which are visible to all users in batches of 10 according to the current pagination
    const all_posts = await PostModel.find({
      "visibility.mode": "all",
    })
      .sort({ date_created: -1 })
      .skip(amount_to_skip)
      .limit(limit)
      .catch((e) =>
        console.error("An error occured while retreiving the posts", e)
      );
    // * If there was an error retrieving the posts
    if (!all_posts) {
      console.error("An error occured while retreiving the posts");
      return res
        .status(500)
        .json("An error occured while retreiving the posts");
    }
    // * If there isn't any post in the collection
    if (all_posts.length < 1) return res.status(404).json("No posts available");

    return res.status(200).json(all_posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

export const edit_post = async () => {};
export const delete_post = async () => {};
