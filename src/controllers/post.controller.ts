import { Request, Response } from "express";
import {
  TPostResponse,
  TCreatePostRequestBody,
  TExtendedRequestTokenData,
  TFetchPostRequestBody,
  TPostVisibilityObject,
  TTokenData,
} from "../utils/types";
import {
  parse_posts,
  parse_single_post,
  send_post_notification,
  upload_file_to_cloudinary,
} from "../utils/utils";
import PostModel from "../models/Post.model";
import community_member_model from "../models/CommunityMember.model";

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
    const { user_id } = req.token_data as TTokenData;
    const { visibility, content } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];
    const uploaded_files_urls: string[] = [];
    // * If the request content type header is in multipart/formdata instead of application/json format,
    // * convert the string values of the visibility parameter to objects
    const post_visibility =
      typeof visibility === "string"
        ? (JSON.parse(visibility) as TPostVisibilityObject)
        : visibility;

    // * If the user intends to post in a community
    if (post_visibility.mode === "community") {
      // * Check if the user is a member of the community he/she intends to post in
      const is_member = await community_member_model.findOne({
        user: user_id,
        community: post_visibility.community_id,
      });

      // * If the user isn't a member of the community, return a 500 error
      if (!is_member) {
        console.error(
          "Could not create post because user is not a member of this community, join the community to create a post in it"
        );
        return res
          .status(500)
          .json(
            "Could not create post because user is not a member of this community, join the community to create a post in it"
          );
      }
    }

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
      visibility: post_visibility,
      content,
      user: user_id,
      topic: req.body.topic || undefined,
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

    // * Send a success response to the client
    res.status(201).json("Post created successfully");

    // * Send post notification to this user's followers/to the community members
    send_post_notification({
      initiated_by: user_id,
      post: {
        _id: created_post._id,
        content: created_post.content,
      },
      ...(post_visibility.mode === "community"
        ? { community_id: post_visibility.community_id }
        : {}),
    });
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
  req: Request<{ post_id: string }, any> & TExtendedRequestTokenData,
  res: Response
) => {
  try {
    const user_id = req.token_data?.user_id;
    const { post_id } = req.params;
    // * Retrieve post from the posts collection via it's ID
    const post_response = await PostModel.findOne({ _id: post_id })
      .populate("user")
      .catch((e) => console.error("Could not retreive post", e));
    // * If error retrieving post
    if (post_response === undefined) {
      console.error("Could not retreive post");
      return res.status(500).json("Could not retreive post");
    }
    // * If post not found
    if (post_response === null) {
      return res.status(404).json("Post not found");
    }

    // * Parse the post, add parameters for the response body, e.g. the reactions, comments, bookmarked state, no. of times shared, etc...
    const post: TPostResponse | void = await parse_single_post(
      post_response,
      user_id,
      { comments: true }
    );

    // * If the above function returned undefined. e.g. in the case of a shared post whose parent post could not be found, return a message that the post wasn't found
    if (!post) return res.status(404).json("Post not found");

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
  } & TExtendedRequestTokenData,
  res: Response
) => {
  const user_id = req.token_data?.user_id;
  const { pagination } = req.body;
  const limit = 10;
  const amount_to_skip = (pagination - 1) * limit;
  try {
    // * If it was specified to retrieve posts by the topics relating to the user
    if (Array.isArray(req.topics)) {
      // * Get posts from the collection which are visible to all users, and belong to at least one of the topics specified, in batches of 10 according to the current pagination
      const posts_belonging_to_topics = await PostModel.find({
        $or: req.topics.map((topic) => ({ topic: topic })),
        "visibility.mode": "all",
      })
        .populate("user")
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
          topic: undefined,
          "visibility.mode": "all",
        })
          .populate("user")
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

        // * Parse each post in the list, return their reaction count, comment count, bookmarked state, total no. of times shared, etc...
        const posts_not_belonging_to_topics_to_be_returned = await parse_posts(
          posts_not_belonging_to_topics,
          user_id || ""
        );

        // * Return the posts with no topic
        return res
          .status(200)
          .json(posts_not_belonging_to_topics_to_be_returned);
      }

      // * Parse each post in the list, return their reaction count, comment count, bookmarked state, total no. of times shared, etc...
      const posts_belonging_to_topics_to_be_returned = await parse_posts(
        posts_belonging_to_topics,
        user_id || ""
      );

      // * Return the posts with the specified topics
      return res.status(200).json(posts_belonging_to_topics_to_be_returned);
    }

    // * If it wasn't specifed to retreive posts according to any topic
    // * Get all posts from the collection which are visible to all users in batches of 10 according to the current pagination
    const all_posts = await PostModel.find({
      "visibility.mode": "all",
    })
      .populate("user")
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

    // * Parse each post in the list, return their reaction count, comment count, bookmarked state, total no. of times shared, etc...
    const posts_to_be_returned = await parse_posts(all_posts, user_id);
    // * Return all the posts in the collection irrespective of their topics
    return res.status(200).json(posts_to_be_returned);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

export const edit_post = async () => {};
export const delete_post = async () => {};
