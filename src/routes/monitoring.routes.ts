import { Router } from "express";
import { get_metrics } from "../controllers/monitoring.controller";

const monitoring_router = Router();

monitoring_router.get("/", get_metrics);

export default monitoring_router;
