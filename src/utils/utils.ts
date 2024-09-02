import { UploadApiOptions, v2 as cloudinary } from "cloudinary";
import DataURIParser from "datauri/parser";
import { Document, Types } from "mongoose";
import path from "path";
import {
  TPostResponse,
  TCommentResponse,
  TPostModel,
  TCommentModel,
} from "./types";
import CommentModel from "../models/Comment.model";

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
 * @param username The username of the user with the current access token (the signed in user)
 * @returns A list of posts
 */
export const parse_posts = async (
  posts: (Document<unknown, {}, TPostModel> &
    TPostModel & {
      _id: Types.ObjectId;
    })[],
  username: string
) => {
  const posts_to_be_returned: TPostResponse[] = [];

  // * Loop through each post in order to add some properties for the response body
  for (const post of posts) {
    // * Parse the post data
    const parsed_post = await parse_single_post(post, username);
    // * Add the parsed post to the list of posts to be returned
    posts_to_be_returned.push(parsed_post);
  }

  return posts_to_be_returned;
};

/**
 * * Function responsible for parsing a post from the collection for the post endpoint response body
 * @param post The post from the post collection to be parsed for the response body
 * @param username The username of the user wo made this request
 * @param config The configuration. I.e. determines if the post comments should be returned
 * @returns The parsed post
 */
export const parse_single_post = async (
  post: Document<unknown, {}, TPostModel> &
    TPostModel & {
      _id: Types.ObjectId;
    },
  username: string,
  config?: { comments: boolean }
): Promise<TPostResponse> => {
  // * Get the comments for this post
  const all_comments = await CommentModel.find({ post_id: post._id }).catch(
    (e) => []
  );

  // * IF THE CONFIG.COMMENTS ARG IS TRUE: Loops through the comment response to filter parent comments from child comments/replies, and adds replies to each parent comment
  const comments = config?.comments
    ? all_comments
        // * Filters out replies, i.e. returns only parent comments
        .filter((comment) => comment.parent_comment_id === undefined)
        // * loops though each parent comment and adds children comments (all comments in the post with it's id as their parent id) as its replies
        .map<TCommentResponse>((comment) => {
          return {
            ...(comment as any)._doc,
            // * Filters all comments in the post which has their parent id as the id of the current comment
            replies: all_comments.filter(
              (reply) =>
                reply.parent_comment_id?.toString() === comment._id.toString()
            ),
          };
        })
    : undefined;

  // * The new post response format
  const parsed_post: TPostResponse = {
    ...(post as any)._doc,
    reactions: {
      like: {
        // * Get the number of likes from the list of the reaction
        count: post.reactions.filter(
          (each_post) => each_post.reaction === "like"
        ).length,
        // * Confirms if the user has perfomed this reaction on this post, i.e. has liked this post
        liked: post.reactions.find(
          (each_post) =>
            each_post.reaction === "like" && each_post.username === username
        )
          ? true
          : false,
      },
      dislike: {
        // * Get the number of dislikes from the list of the reaction
        count: post.reactions.filter(
          (each_post) => each_post.reaction === "dislike"
        ).length,
        // * Confirms if the user has perfomed this reaction on this post, i.e. has disliked this post
        disliked: post.reactions.find(
          (each_post) =>
            each_post.reaction === "dislike" && each_post.username === username
        )
          ? true
          : false,
      },
    },
    bookmarked: false,
    shares: { count: 0, shared: false },
    comments_count: all_comments.length,
    // * IF THE CONFIG.COMMENT ARG IS ENABLED: Add the comments parameter with the parsed comments
    ...(config?.comments ? { comments } : {}),
  };

  return parsed_post;
};

/**
 * * Function responsible for parsing a comment from the collection for the comment endpoint response body
 * @param comment The comment data from the collection
 * @param username The username of the user making the request (from the access token)
 * @returns The parsed comment data
 */
export const parse_comment = async (
  comment: Document<unknown, {}, TCommentModel> &
    TCommentModel & {
      _id: Types.ObjectId;
    },
  username: string
): Promise<TCommentResponse> => {
  const parsed_comment: TCommentResponse = {
    ...(comment as any)._doc,
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
            each_comment.username === username
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
            each_comment.username === username
        )
          ? true
          : false,
      },
    },
  };

  return parsed_comment;
};
