import { Request, Response } from "express";
import { TTopicModel } from "../utils/types";
import TopicModel from "../models/Topic.model";

export const create_topics = async (
  req: Request<any, any, { names: string[] }>,
  res: Response
) => {
  try {
    const { names } = req.body;
    const parsed_topics: TTopicModel[] = [];

    // * Retrieve the list of existing topics in the Topics collection
    const existing_topics =
      (await TopicModel.find().catch((e) =>
        console.error("ERROR RETRIEVING THE EXISTING TOPICS", e)
      )) || [];

    // * Goes through each string in the names object, creates the corresponding topic reference for each topic name, and adds both the topic name and it's ref to the list of parsed topics
    for (const name of names) {
      const topic_ref = name.toLocaleLowerCase().split(" ").join("-");

      // * Search if there's any existing topic with this ref in the list of parsed topics OR in the list of existing topics, if there is, don't bother adding this topic to the list
      if (
        parsed_topics.find((topic) => topic.topic_ref === topic_ref) ||
        existing_topics.find((topic) => topic.topic_ref === topic_ref)
      )
        continue;

      // * Add new topic name and ref to the list of parsed topics
      parsed_topics.push({ name, topic_ref });
    }

    // * Add all the topics in the list of parsed topics to the Topics collection
    const added_topics = await TopicModel.insertMany(parsed_topics).catch((e) =>
      console.error(`ERROR CREATING THE NEW TOPICS`)
    );

    if (!added_topics)
      return res.status(500).json("Could not create the topics");

    return res.status(201).json("Topics added successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};

export const get_topics = async (req: Request, res: Response) => {
  try {
    // * Retrieve the list of existing topics in the Topics collection
    const topics = await TopicModel.find().catch((e) =>
      console.error("ERROR RETRIEVING THE TOPICS", e)
    );

    if (!topics) {
      console.error("Could not retrieve topics");
      return res.status(500).json("Could not retrieve topics");
    }

    return res.status(200).json(topics);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal server error");
  }
};
