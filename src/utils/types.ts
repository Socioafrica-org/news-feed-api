import { Schema } from "mongoose";

export type TTopicModel = {
  topic_ref: string;
  name: string;
};

export type TPostModel = {
  visibility: { mode: "all" | "community"; community_id: string };
  username: string;
  content: string;
  file_urls: string[];
  topics: string[];
  shares: number;
  date_created: Date | string | number;
  reactions: TPostReaction[];
};

export type TCommentModel = {
  username: string;
  content: string;
  parent_comment_id: Schema.Types.ObjectId;
  reply_to: string;
  post_id: Schema.Types.ObjectId;
  reactions: TCommentReaction[];
};

export type TCommentResponse = TCommentModel & {
  replies: TCommentModel[];
};

export type TPostResponse = TPostModel & {
  comments: TCommentModel[];
};

export type TPostReaction = {
  username: string;
  reaction: "like" | "dislike";
  post_id: Schema.Types.ObjectId;
};

export type TCommentReaction = {
  username: string;
  reaction: "like" | "dislike";
};

export type TCreatePostRequestBody = {
  visibility: { type: "all" | "community"; community_id: string };
  content: string;
  topics: string[];
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
  reaction: "like" | "dislike";
};
