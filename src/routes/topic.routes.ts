import { Router } from "express";
import { create_topics, get_topics } from "../controllers/topic.controller";

const topic_router = Router();

topic_router.get("/", get_topics);
topic_router.post("/", create_topics);

export default topic_router;
