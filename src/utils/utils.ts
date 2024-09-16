import { UploadApiOptions, v2 as cloudinary } from "cloudinary";
import DataURIParser from "datauri/parser";
import { Document, Schema, Types } from "mongoose";
import path from "path";
import {
  TPostResponse,
  TCommentResponse,
  TPostModel,
  TCommentModel,
  TUserModel,
} from "./types";
import CommentModel from "../models/Comment.model";
import bookmark_model from "../models/Bookmark.model";
import PostModel from "../models/Post.model";
import UserModel from "../models/User.model";

/**
 * * Uploads a file to cloudinary object storage
 * @param file The file to be uploaded, typically a multer object
 * @param options The options configuration containing the folder, resource_type, etc...
 * @returns object
 */
export const upload_file_to_cloudinary = async (
  file: Express.Multer.File,
  options?: UploadApiOptions
) => {
  // * Connect to the cloudinary API
  cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  });

  const parser = new DataURIParser();
  const base_64_file = parser.format(
    path.extname(file.originalname).toString(),
    file.buffer
  );

  if (base_64_file && base_64_file.content) {
    return await cloudinary.uploader.upload(base_64_file.content, {
      resource_type: "auto",
      ...options,
    });
  } else {
    throw new Error("Couldn't upload file to object storage");
  }
};

/**
 * * Function responsible for parsing the list posts retrieved from the post collection for the get posts endpoint response body
 * @param posts The list of posts from the Post collection
 * @param user_id The user_id of the user with the current access token (the signed in user)
 * @returns A list of posts
 */
export const parse_posts = async (
  posts: (Document<unknown, {}, TPostModel> &
    TPostModel & {
      _id: Types.ObjectId;
    })[],
  user_id: Schema.Types.ObjectId | string
) => {
  const posts_to_be_returned: TPostResponse[] = [];

  // * Loop through each post in order to add some properties for the response body
  for (const post of posts) {
    // * Parse the post data
    const parsed_post = await parse_single_post(post, user_id);

    // * If the above function returned undefined. e.g. in the case of a shared post whose parent post could not be found, skip this post
    if (!parsed_post) continue;

    // * Add the parsed post to the list of posts to be returned
    posts_to_be_returned.push(parsed_post);
  }

  return posts_to_be_returned;
};

/**
 * * Function to parse the user data retrieved from the collection and returns only the user metadata
 * @param user The user data as returned from the collection
 */
const transform_user_details = (user: TUserModel) => {
  // * If the user hasn't uploaded his/her image, i.e. the image field doesn't exist, add it
  if (user && !user.metadata.image) user.metadata.image = null;

  user.metadata.username = user.username;
  return user.metadata;
};

/**
 * * Function to retrieve the details of a user
 * @param user_id The user_id of the user whose details are to be retrieved
 * @returns The details of the user, i.e. the user's firstname, lastname, image, gender, etc
 */
const get_user_details = async (user_id: Schema.Types.ObjectId) => {
  // * Retrieve the user with this user_id from the collection
  const user = await UserModel.findById(user_id).catch((e) => {});

  if (!user) return;

  return transform_user_details(user);
};

/**
 * * Function responsible for parsing a post from the collection for the post endpoint response body
 * @param post_details_to_be_parsed The post from the post collection to be parsed for the response body
 * @param user_id The user_id of the user wo made this request
 * @param config The configuration. I.e. determines if the post comments should be returned
 * @returns The parsed post
 */
export const parse_single_post = async (
  post: Document<unknown, {}, TPostModel> &
    TPostModel & {
      _id: Types.ObjectId;
    },
  user_id: Schema.Types.ObjectId | string,
  config?: {
    comments: boolean;
  }
): Promise<TPostResponse | undefined | void> => {
  let post_details_to_be_parsed = post;

  // * Check if this post is a shared post, i.e. is not the original post
  if (post.parent_post_id && post.shared_by) {
    // * If it is a shared post, retrieve the original post details from the collection
    const original_post = await PostModel.findOne({
      _id: post.parent_post_id,
    })
      .populate("user")
      .catch((e) =>
        console.error("An error occured while retrieving the parent post", e)
      );
    // * If the original post was not found, return undefined
    if (!original_post)
      return console.error("The original post could not be found");

    // * Set the post details to be returned to the details of the original post
    post_details_to_be_parsed = original_post;
  }

  // * Get the comments for this post
  const all_comments = await CommentModel.find({
    post_id: post_details_to_be_parsed._id,
  })
    .populate("user")
    .catch((e) => []);

  // * Parse each comment to include the comment metadata, e.g if it was bookmarked, it's reactions, the details of the user who shared it
  const parsed_comments: (TCommentResponse & {
    _id?: Schema.Types.ObjectId;
  })[] = [];

  // * Loop through the retrieved comments for each post and parse each comment
  for (const comment of all_comments) {
    // * The parsed comment containing all the necessary metadata
    const parsed_comment = await parse_comment(comment, user_id);

    parsed_comments.push(parsed_comment);
  }

  // * IF THE CONFIG.COMMENTS ARG IS TRUE: Loops through the comment response to filter parent comments from child comments/replies, and adds replies to each parent comment
  const comments = config?.comments
    ? parsed_comments
        // * Filters out replies, i.e. returns only parent comments
        .filter((comment) => comment.parent_comment_id === undefined)
        // * loops though each parent comment and adds children comments (all comments in the post with it's id as their parent id) as its replies
        .map<TCommentResponse>((parsed_comment) => {
          return {
            ...parsed_comment,
            // * Filters all comments in the post which has their parent id as the id of the current comment
            replies: parsed_comments.filter(
              (reply) =>
                reply.parent_comment_id?.toString() ===
                parsed_comment?._id?.toString()
            ),
          };
        })
    : undefined;

  // * Check if an existing bookmark of this post/comment and user_id exists in the collection
  const existing_bookmark = await bookmark_model
    .findOne({
      user: user_id,
      post_id: post_details_to_be_parsed._id,
    })
    .catch((e) => console.error("Error retrieving the bookmark", e));

  // * If an error occured while retrieving the existing bookmark
  if (existing_bookmark === undefined) {
    console.error("Error retrieving the bookmark");
  }

  // * Retrieve the posts in the collection which are based off this post
  const shares = await PostModel.find({
    parent_post_id: post_details_to_be_parsed._id,
  }).catch((e) => []);

  // * Retrieve the details of the user who created this post
  const user = !post_details_to_be_parsed.user
    ? await get_user_details(post_details_to_be_parsed.user)
    : transform_user_details(
        post_details_to_be_parsed.user as unknown as TUserModel
      );

  // * The new post response format
  const parsed_post: TPostResponse = {
    ...(post_details_to_be_parsed as any)._doc,
    parent_post_id: post.parent_post_id,
    shared_by: post.shared_by,
    user,
    reactions: {
      like: {
        // * Get the number of likes from the list of the reaction
        count: post_details_to_be_parsed.reactions.filter(
          (each_post) => each_post.reaction === "like"
        ).length,
        // * Confirms if the user has perfomed this reaction on this post, i.e. has liked this post
        liked: post_details_to_be_parsed.reactions.find(
          (each_post) =>
            each_post.reaction === "like" &&
            each_post.user?.toString() === user_id.toString()
        )
          ? true
          : false,
      },
      dislike: {
        // * Get the number of dislikes from the list of the reaction
        count: post_details_to_be_parsed.reactions.filter(
          (each_post) => each_post.reaction === "dislike"
        ).length,
        // * Confirms if the user has perfomed this reaction on this post, i.e. has disliked this post
        disliked: post_details_to_be_parsed.reactions.find(
          (each_post) =>
            each_post.reaction === "dislike" &&
            each_post.user?.toString() === user_id.toString()
        )
          ? true
          : false,
      },
    },
    bookmarked: existing_bookmark ? true : false,
    shares: {
      count: shares.length,
      // * Confirm if this user has previously shared this post
      shared: shares.find(
        (share) => share.user?.toString() === user_id.toString()
      )
        ? true
        : false,
    },
    comments_count: all_comments.length,
    // * IF THE CONFIG.COMMENT ARG IS ENABLED: Add the comments parameter with the parsed comments
    ...(config?.comments ? { comments } : {}),
  };

  return parsed_post;
};

/**
 * * Function responsible for parsing a comment from the collection for the comment endpoint response body
 * @param comment The comment data from the collection
 * @param user_id The user_id of the user making the request (from the access token)
 * @returns The parsed comment data
 */
export const parse_comment = async (
  comment: Document<unknown, {}, TCommentModel> &
    TCommentModel & {
      _id: Types.ObjectId;
    },
  user_id: Schema.Types.ObjectId | string
): Promise<TCommentResponse> => {
  // * Check if an existing bookmark of this post/comment and user_id exists in the collection
  const existing_bookmark = await bookmark_model
    .findOne({
      user: user_id,
      comment_id: comment._id,
    })
    .catch((e) => console.error("Error retrieving the bookmark", e));

  // * If an error occured while retrieving the existing bookmark
  if (existing_bookmark === undefined) {
    console.error("Error retrieving the bookmark");
  }

  // * Retrieve the details of the user who created this post
  const user = !comment.user
    ? await get_user_details(comment.user)
    : transform_user_details(comment.user as unknown as TUserModel);

  const parsed_comment: TCommentResponse = {
    ...(comment as any)._doc,
    user,
    reactions: {
      like: {
        // * Get the number of likes from the list of the reaction
        count: comment.reactions.filter(
          (each_comment) => each_comment.reaction === "like"
        ).length,
        // * Confirms if the user has perfomed this reaction on this comment, i.e. has liked this comment
        liked: comment.reactions.find(
          (each_comment) =>
            each_comment.reaction === "like" &&
            each_comment.user?.toString() === user_id.toString()
        )
          ? true
          : false,
      },
      dislike: {
        // * Get the number of likes from the list of the reaction
        count: comment.reactions.filter(
          (each_comment) => each_comment.reaction === "dislike"
        ).length,
        // * Confirms if the user has perfomed this reaction on this comment, i.e. has disliked this comment
        disliked: comment.reactions.find(
          (each_comment) =>
            each_comment.reaction === "dislike" &&
            each_comment.user?.toString() === user_id.toString()
        )
          ? true
          : false,
      },
    },
    bookmarked: existing_bookmark ? true : false,
  };

  return parsed_comment;
};
