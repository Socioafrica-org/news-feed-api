import { Schema } from "mongoose";

export type TTopicModel = {
  topic_ref: string;
  name: string;
};

type TReactions = "like" | "dislike";
type TVisibilityModes = "all" | "community" | "private";

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
  username: string;
  content: string;
  file_urls: string[];
  topic: string;
  shares: string[];
  date_created: Date | string | number;
  reactions: TPostReaction[];
  parent_post_id?: Schema.Types.ObjectId;
  shared_by?: string;
};

export type TCommentModel = {
  username: string;
  content: string;
  parent_comment_id: Schema.Types.ObjectId;
  reply_to: string;
  post_id: Schema.Types.ObjectId;
  reactions: TCommentReaction[];
};

export type TCommentResponse = Omit<TCommentModel, "reactions"> & {
  replies?: TCommentResponse[];
  reactions: TReactionsCount;
  bookmarked: boolean;
};

export type TPostReaction = {
  username: string;
  reaction: TReactions;
  post_id: Schema.Types.ObjectId;
};

export type TCommentReaction = {
  username: string;
  reaction: TReactions;
};

export type TCreatePostRequestBody = {
  visibility: { type: TVisibilityModes; community_id: string };
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
  reactions: TReactionsCount;
  comments_count?: number;
  comments?: TCommentModel[];
  bookmarked: boolean;
  shares: { count: number; shared: boolean };
};

export type TBookmarkModel = {
  username: string;
  post_id: string;
  comment_id: string;
};
