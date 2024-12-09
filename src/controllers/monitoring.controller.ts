import client from "prom-client";
import { METRIC_LABEL_ENUM, TMetricsRequest } from "../utils/types";
import { NextFunction, Request, Response } from "express";
import { MetricLabelClass } from "../utils/utils";

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "socio_" });

// * The http_request counter for measuring the average and instantaneous no. of requests made to the application
const http_request_total = new client.Counter({
  name: "socio_http_request_total",
  help: "The total number of HTTP requests received",
  labelNames: [
    METRIC_LABEL_ENUM.PATH,
    METRIC_LABEL_ENUM.METHOD,
    METRIC_LABEL_ENUM.STATUS_CODE,
  ],
});

// * The http_request_duration_seconds histogram for measuring the latency of HTTP requests
const request_duration = new client.Histogram({
  name: "socio_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: [
    METRIC_LABEL_ENUM.PATH,
    METRIC_LABEL_ENUM.METHOD,
    METRIC_LABEL_ENUM.STATUS_CODE,
  ],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5],
});

// * Registers the HTTP request counter metric
register.registerMetric(http_request_total);

// * Registers the HTTP request latency metric
register.registerMetric(request_duration);

/**
 * * Get's the metrics to be sent to the prometheus server
 * @param req The express Js req object
 * @param res The express Js response object
 * @param next The express Js next function
 */
export const get_metrics = async (req: Request, res: Response) => {
  res.setHeader("Content-type", register.contentType);
  res.send(await register.metrics());
};

/**
 * * Ends the timer, increments the http_request_total metric, and observes the request duration
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @param start The start time of the request
 * */
const end_timer = (req: TMetricsRequest, res: Response, start: number) => {
  // * Calculate request duration in seconds
  const duration = (Date.now() - start) / 1000;

  // * Observe the duration it took for the request to get completed
  request_duration
    .labels(
      new MetricLabelClass(req.method, req.req_url.pathname, res.statusCode)
    )
    .observe(duration);
};

/**
 * * The middleware responsible for intercepting, setting the timer, and incrementing the http_request_total metric on each request
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @param next The Express Js next function
 */
export const manage_metric_middlewares = (
  req: TMetricsRequest,
  res: Response,
  next: NextFunction
) => {
  // * Get's the Req URL object
  const req_url = new URL(req.url, `http://${req.headers.host}`);
  req.req_url = req_url;

  // * Increment the http_request_total metric
  http_request_total.inc(
    new MetricLabelClass(req.method, req.req_url.pathname, res.statusCode)
  );

  // * Start the timer when the http request begins getting processed
  const start = Date.now();

  // * Listen for the response finished event
  res.on("finish", () => {
    // * Records the duration of the current HTTP request
    end_timer(req, res, start);
    // console.log("REQUEST IS DONE PROCESSING", req_url.pathname);
  });

  // * Listen for the response error event
  res.on("error", () => {
    // * Records the duration of the current HTTP request
    end_timer(req, res, start);
    // console.log("REQUEST ENCOUNTERED ERROR", req_url.pathname);
  });

  next();
};

/**
 * * The middleware responsible for handling uncaught errors from each endpoint in the webserver
 * @param error The Express Js error parameter
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @param next The Express Js next function
 */
export const manage_error_middleware = (
  error: any,
  req: TMetricsRequest,
  res: Response,
  next: NextFunction
) => {
  // * Increment the http_request_total metric
  //   http_request_total.inc(
  //     new MetricLabelClass(req.method, req.req_url.pathname, res.statusCode)
  //   );
  console.error(error);
  return res.status(500).json("Internal server error");
};

/**
 * * The middleware responsible for handling 404 responses in the web server. I.e. when an endpoint doesn't exist
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @param next The Express Js next function
 */
export const manage_404_middleware = (
  req: TMetricsRequest,
  res: Response,
  next: NextFunction
) => {
  // * Increment the http_request_total metric
  //   http_request_total.inc(
  //     new MetricLabelClass(req.method, req.req_url.pathname, res.statusCode)
  //   );
  next();
};
