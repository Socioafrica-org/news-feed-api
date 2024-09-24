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
  TUserModelMetaData,
  TCommunityMemberModel,
} from "./types";
import CommentModel from "../models/Comment.model";
import bookmark_model from "../models/Bookmark.model";
import PostModel from "../models/Post.model";
import UserModel from "../models/User.model";
import follower_model from "../models/Follower.model";
import community_member_model from "../models/CommunityMember.model";

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
export const transform_user_details = (
  user: TUserModel
): TUserModelMetaData | undefined => {
  if (!user || !user.metadata) return;

  const parsed_user = (user as any).metadata._doc;

  // * If the user hasn't uploaded his/her image, i.e. the image field doesn't exist, add it
  if (!parsed_user.image) parsed_user.image = null;

  parsed_user.username = user.username;
  return parsed_user;
};

/**
 * * Function to retrieve the details of a user
 * @param user_id The user_id of the user whose details are to be retrieved
 * @returns The details of the user, i.e. the user's firstname, lastname, image, gender, etc
 */
const get_user_details = async (user_id: Schema.Types.ObjectId | string) => {
  // * Retrieve the user with this user_id from the collection
  const user = await UserModel.findById(user_id).catch((e) => {});

  if (!user) return;

  return transform_user_details(user);
};

/**
 * * Function to validate is a variable is a valid Mongoose Objectd
 * @param item_to_check The variable to validate if it's an object id
 * @returns true or false
 */
const is_valid_object_id = (item_to_check: any) => {
  return (
    Types.ObjectId.isValid(item_to_check) &&
    (item_to_check instanceof Types.ObjectId ||
      typeof item_to_check === "string")
  );
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
  const is_user_object_id = is_valid_object_id(post_details_to_be_parsed.user);
  const user = is_user_object_id
    ? await get_user_details(post_details_to_be_parsed.user.toString())
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
  const is_user_object_id = is_valid_object_id(comment.user);

  const user = is_user_object_id
    ? await get_user_details(comment.user.toString())
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

/**
 * * Function responsible for retrieving the list/total count of users following a particular user
 * @param user_id The id of the user to retrieve the followers
 * @param config Contans options e.g. `detailed` which indicates if the function should retrieve the list of followers with their user profile, and `pagination` the set of followers to be retrieved
 * @returns The list or total count of the user's followers
 */
export const retrieve_user_followers = async (
  user_id: Types.ObjectId,
  config?: { detailed: true; pagination: number }
): Promise<TUserModelMetaData[] | number> => {
  if (!config?.detailed) {
    // * Retrieve the total count of users following this user
    const followers_count = await follower_model
      .countDocuments({ following: user_id })
      .catch((e) => 0);

    return followers_count;
  }

  const limit = 10;
  const amount_to_skip = (config.pagination - 1) * limit;

  // * Retrieve the list of users following this user alongside their user profiles
  const followers = await follower_model
    .find({ following: user_id })
    .populate("user")
    .skip(amount_to_skip)
    .limit(limit);

  // * The parsed list of followers to be returned
  const parsed_followers: TUserModelMetaData[] = [];

  // * Loop trhough the list of followers retrieved from the collection and parse the follower user profile to the correct schema
  for (const follower of followers) {
    // * Parse the schema of the follower's profile
    const parsed_follower = transform_user_details(
      follower.user as unknown as TUserModel
    );

    if (!parsed_follower) continue;

    // * Add the parsed follower's object to the list of followers to be returned
    parsed_followers.push({ ...parsed_follower });
  }

  return parsed_followers;
};

/**
 * * Function responsible for checking if a user is followed by anpther
 * @param follower The id of the follower
 * @param followee The id of the user who is being followed
 * @returns true if the user is following the other
 */
export const check_user_following = async (
  user_id: Types.ObjectId | string,
  followee: Types.ObjectId | string
): Promise<boolean> => {
  const is_following = await follower_model.findOne({
    user: user_id,
    following: followee,
  });

  return is_following ? true : false;
};

/**
 * * Function responsible for retrieving the list/total count of users followed by a particular user
 * @param user_id The id of the user to retrieve the followees
 * @param config Contans options e.g. `detailed` which indicates if the function should retrieve the list of followees with their user profile, and `pagination` the set of followes to be retrieved
 * @returns The list or total count of the user's followers
 */
export const retrieve_user_followees = async (
  user_id: Types.ObjectId,
  config?: { detailed: true; pagination: number }
): Promise<TUserModelMetaData[] | number> => {
  if (!config?.detailed) {
    // * Retrieve the total count of users followed by this user
    const followers_count = await follower_model
      .countDocuments({ user: user_id })
      .catch((e) => 0);

    return followers_count;
  }

  const limit = 10;
  const amount_to_skip = (config.pagination - 1) * limit;

  // * Retrieve the list of users followed by this user alongside their user profiles
  const followees = await follower_model
    .find({ user: user_id })
    .populate("following")
    .skip(amount_to_skip)
    .limit(limit);

  // * The parsed list of followees to be returned
  const parsed_followees: TUserModelMetaData[] = [];

  for (const followee of followees) {
    // * Parse the schema of the followee's profile
    const parsed_followee = transform_user_details(
      followee.following as unknown as TUserModel
    );

    if (!parsed_followee) continue;

    // * Add the parsed followee's object to the list of followees to be returned
    parsed_followees.push({ ...parsed_followee });
  }

  return parsed_followees;
};

/**
 * * Function responsible for retrieving the list/total count of communities a user is a member of
 * @param user_id The id of the user to retrieve the communities
 * @param config Contans options e.g. `detailed` which indicates if the function should retrieve the list of communities with their details, and `pagination` the set of communities to be retrieved
 * @returns The list or total count of the user's communities
 */
export const retrieve_user_communities = async (
  user_id: Types.ObjectId,
  config?: { detailed: true; pagination: number }
): Promise<TCommunityMemberModel[] | number> => {
  if (!config?.detailed) {
    // * Retrieve the total count of users communities this user is a member of
    const communities_count = await community_member_model
      .countDocuments({ user: user_id })
      .catch((e) => 0);

    return communities_count;
  }

  const limit = 10;
  const amount_to_skip = (config.pagination - 1) * limit;

  // * Retrieve the list of users communities this user is a member of alongside the details of each community
  const communities = await community_member_model
    .find({ user: user_id })
    .populate("community")
    .skip(amount_to_skip)
    .limit(limit);

  return communities;
};

/**
 * * Function responsible for retrieving the list/total count of posts uploaded/shared by a user
 * @param user_id The id of the user to retrieve the posts
 * @param config Contans options e.g. `detailed` which indicates if the function should retrieve the list of posts with their details, and `pagination` the set of posts to be retrieved
 * @returns The list or total count of posts uploaded/shared by the user
 */
export const retrieve_user_posts = async (
  user_id: Types.ObjectId,
  config?: { detailed: true; pagination: number }
): Promise<TPostResponse[] | number> => {
  if (!config?.detailed) {
    // * Retrieve the total count of posts uploaded/shared by a user
    const posts_count = await PostModel.countDocuments({
      $or: [{ user: user_id }, { shared_by: user_id }],
    }).catch((e) => 0);

    return posts_count;
  }

  const limit = 10;
  const amount_to_skip = (config.pagination - 1) * limit;

  // * Retrieve the list of posts uploaded/shared by a user in batches of 10
  const posts = await PostModel.find({
    $or: [{ user: user_id }, { shared_by: user_id }],
  })
    .populate("user")
    .sort({ date_created: -1 })
    .skip(amount_to_skip)
    .limit(limit);

  // * Parse each post in the list, return their reaction count, comment count, bookmarked state, total no. of times shared, etc...
  const parsed_posts = await parse_posts(posts, user_id.toString());

  return parsed_posts;
};

/**
 * * Function responsible for retrieving the list/total count of posts liked by a user
 * @param user_id The id of the user to retrieve the posts
 * @param config Contans options e.g. `detailed` which indicates if the function should retrieve the list of liked posts with their details, and `pagination` the set of posts to be retrieved
 * @returns The list or total count of posts liked by the user
 */
export const retrieve_user_liked_posts = async (
  user_id: Types.ObjectId,
  config?: { detailed: true; pagination: number }
): Promise<TPostResponse[] | number> => {
  if (!config?.detailed) {
    // * Retrieve the total count of posts liked by a user
    const liked_posts_count = await PostModel.countDocuments({
      reactions: { $elemMatch: { user: user_id, reaction: "like" } },
    }).catch((e) => 0);

    return liked_posts_count;
  }

  const limit = 10;
  const amount_to_skip = (config.pagination - 1) * limit;

  // * Retrieve the list of posts liked by a user in batches of 10
  const liked_posts = await PostModel.find({
    reactions: { $elemMatch: { user: user_id, reaction: "like" } },
  })
    .populate("user")
    .sort({ date_created: -1 })
    .skip(amount_to_skip)
    .limit(limit);

  // * Parse each post in the list, return their reaction count, comment count, bookmarked state, total no. of times shared, etc...
  const parsed_liked_posts = await parse_posts(liked_posts, user_id.toString());

  return parsed_liked_posts;
};

/**
 * * Function responsible for retrieving the list/total count of posts disliked by a user
 * @param user_id The id of the user to retrieve the posts
 * @param config Contans options e.g. `detailed` which indicates if the function should retrieve the list of disliked posts with their details, and `pagination` the set of posts to be retrieved
 * @returns The list or total count of posts disliked by the user
 */
export const retrieve_user_disliked_posts = async (
  user_id: Types.ObjectId,
  config?: { detailed: true; pagination: number }
): Promise<TPostResponse[] | number> => {
  if (!config?.detailed) {
    // * Retrieve the total count of posts liked by a user
    const disliked_posts_count = await PostModel.countDocuments({
      reactions: { $elemMatch: { user: user_id, reaction: "dislike" } },
    }).catch((e) => 0);

    return disliked_posts_count;
  }

  const limit = 10;
  const amount_to_skip = (config.pagination - 1) * limit;

  // * Retrieve the list of posts liked by a user in batches of 10
  const disliked_posts = await PostModel.find({
    reactions: { $elemMatch: { user: user_id, reaction: "dislike" } },
  })
    .populate("user")
    .sort({ date_created: -1 })
    .skip(amount_to_skip)
    .limit(limit);

  // * Parse each post in the list, return their reaction count, comment count, bookmarked state, total no. of times shared, etc...
  const parsed_disliked_posts = await parse_posts(
    disliked_posts,
    user_id.toString()
  );

  return parsed_disliked_posts;
};

/**
 * * Function responsible for retrieving the list/total count of posts saved/bookmarked by a user
 * @param user_id The id of the user to retrieve the posts
 * @param config Contans options e.g. `detailed` which indicates if the function should retrieve the list of saved/bookmarked posts with their details, and `pagination` the set of posts to be retrieved
 * @returns The list or total count of posts saved/bookmarked by the user
 */
export const retrieve_user_saved_posts = async (
  user_id: Types.ObjectId,
  config?: { detailed: true; pagination: number }
): Promise<TPostResponse[] | number> => {
  if (!config?.detailed) {
    // * Retrieve the total count of posts saved/bookmarked by a user
    const saved_posts_count = await bookmark_model
      .countDocuments({
        user: user_id,
        post_id: { $exists: true },
      })
      .catch((e) => 0);

    return saved_posts_count;
  }

  const limit = 10;
  const amount_to_skip = (config.pagination - 1) * limit;

  // * Retrieve the list of posts saved/bookmarked by a user in batches of 10
  const saved_posts = await bookmark_model
    .find({
      user: user_id,
      post_id: { $exists: true },
    })
    .populate({ path: "post_id", populate: "user" })
    .sort({ date_created: -1 })
    .skip(amount_to_skip)
    .limit(limit);

  const parsed_saved_posts: TPostResponse[] = [];

  // * Loop through each bookmark, and extract the data of the post it referenced
  for (const bookmark of saved_posts) {
    // * Parse the post referenced by the bookmark, i.e. its details, comment count, reaction count, etc
    const parsed_saved_post = await parse_single_post(
      bookmark.post_id as unknown as Document<unknown, {}, TPostModel> &
        TPostModel & { _id: Types.ObjectId },
      user_id.toString()
    );

    if (!parsed_saved_post) continue;

    parsed_saved_posts.push(parsed_saved_post);
  }

  return parsed_saved_posts;
};

/**
 * * Function responsible for retrieving the list/total count of comments saved/bookmarked by a user
 * @param user_id The id of the user to retrieve the comments
 * @param config Contans options e.g. `detailed` which indicates if the function should retrieve the list of saved/bookmarked comments with their details, and `pagination` the set of posts to be retrieved
 * @returns The list or total count of comments saved/bookmarked by the user
 */
export const retrieve_user_saved_comments = async (
  user_id: Types.ObjectId,
  config?: { detailed: true; pagination: number }
): Promise<TCommentResponse[] | number> => {
  if (!config?.detailed) {
    // * Retrieve the total count of comments saved/bookmarked by a user
    const saved_posts_count = await bookmark_model
      .countDocuments({
        user: user_id,
        post_id: { $exists: true },
      })
      .catch((e) => 0);

    return saved_posts_count;
  }

  const limit = 10;
  const amount_to_skip = (config.pagination - 1) * limit;

  // * Retrieve the list of comments saved/bookmarked by a user in batches of 10
  const saved_comments = await bookmark_model
    .find({
      user: user_id,
      comment_id: { $exists: true },
    })
    .populate({ path: "comment_id", populate: "user" })
    .sort({ date_created: -1 })
    .skip(amount_to_skip)
    .limit(limit);

  const parsed_saved_comments: TCommentResponse[] = [];

  // * Loop through each bookmark, and extract the data of the comment it referenced
  for (const bookmark of saved_comments) {
    // * Parse the comment referenced by the bookmark, i.e. its details, replies count, reaction count, etc
    const parsed_saved_comment = await parse_comment(
      bookmark.comment_id as unknown as Document<unknown, {}, TCommentModel> &
        TCommentModel & { _id: Types.ObjectId },
      user_id.toString()
    );

    if (!parsed_saved_comment) continue;

    parsed_saved_comments.push(parsed_saved_comment);
  }

  return parsed_saved_comments;
};
