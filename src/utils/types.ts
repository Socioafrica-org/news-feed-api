import { Schema, Types } from "mongoose";

export type TTopicModel = {
  topic_ref: string;
  name: string;
};

type TReactions = "like" | "dislike";
export type TVisibilityModes = "all" | "community" | "private";
type TCommunityVisibilityModes = "all" | "manual";
type TCommunityMemberRoles = "super_admin" | "admin" | "member";

type TReactionsCount = {
  like: {
    count: number;
    liked: boolean;
  };
  dislike: {
    count: number;
    disliked: boolean;
  };
};

export type TPostModel = {
  visibility: { mode: TVisibilityModes; community_id: string };
  user: Types.ObjectId;
  content: string;
  file_urls: string[];
  topic: string;
  shares: string[];
  date_created: Date | string | number;
  reactions: TPostReaction[];
  parent_post_id?: Types.ObjectId;
  shared_by?: string;
};

export type TCommentModel = {
  user: Types.ObjectId;
  content: string;
  parent_comment_id: Types.ObjectId;
  reply_to: Types.ObjectId;
  post_id: Types.ObjectId;
  reactions: TCommentReaction[];
  date_created: Date | string | number;
};

export type TCommentResponse = Omit<TCommentModel, "reactions"> & {
  replies?: TCommentResponse[];
  reactions: TReactionsCount;
  bookmarked: boolean;
};

export type TPostReaction = {
  user: Types.ObjectId;
  reaction: TReactions;
  post_id: Types.ObjectId;
};

export type TCommentReaction = {
  user: Types.ObjectId;
  reaction: TReactions;
};

export type TPostVisibilityObject = { mode: TVisibilityModes; community_id: string };

export type TCreatePostRequestBody = {
  visibility: TPostVisibilityObject;
  content: string;
  topic: string;
  images: File[];
};

export type TTokenData = { user_id: string; username: string };

export type TExtendedRequestTokenData = {
  token_data: TTokenData;
};

export type TFetchPostRequestBody = { pagination: number; topics: string[] };

export type TReactionRequestBody = {
  post_id: string;
  comment_id: string;
  reaction: TReactions;
};

export type TPostResponse = Omit<TPostModel, "reactions" | "shares"> & {
  is_shared_post: boolean,
  reactions: TReactionsCount;
  comments_count?: number;
  comments?: TCommentModel[];
  bookmarked: boolean;
  shares: { count: number; shared: boolean };
};

export type TBookmarkModel = {
  user: { required: true; type: Types.ObjectId; ref: "User" };
  post_id: Types.ObjectId;
  comment_id: Types.ObjectId;
};

export type TUserModel = {
  email: string;
  password: string;
  username: string;
  authenticated: boolean;
  metadata: TUserModelMetaData;
};

export type TUserModelMetaData = {
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  image?: string | null;
  cover_image?: string | null;
  bio?: string | null;
  username?: string;
};

export type TFollowerModel = {
  user: Types.ObjectId;
  following: Types.ObjectId;
};

export type TCommunityModel = {
  name: string;
  description: string;
  topics: string[];
  image: string;
  cover_image: string;
  visibility: TCommunityVisibilityModes;
};

export type TCommunityMemberModel = {
  user: Types.ObjectId;
  community: Types.ObjectId;
  role: TCommunityMemberRoles;
};

export type TUserDetailResponse = TUserModelMetaData & {
  email: string;
  followers_count: number;
  followees_count: number;
  communities_count: number;
  posts_count: number;
  is_following: boolean | undefined;
};

export type TFollowerResponse = Omit<TFollowerModel, "user"> & {
  user: TUserModelMetaData;
};

export type TFolloweeResponse = Omit<TFollowerModel, "following"> & {
  following: TUserModelMetaData;
};

export type TCommunityResponse = TCommunityModel & {
  is_member: boolean;
  is_admin: boolean;
  members_count: number;
};

export type TNotificationModel = {
  user: Types.ObjectId;
  initiated_by: Types.ObjectId;
  content: string;
  read: boolean;
  ref: {
    mode: "post" | "comment" | "react" | "follow";
    ref_id: Types.ObjectId;
    post_id?: Types.ObjectId
  };
};
