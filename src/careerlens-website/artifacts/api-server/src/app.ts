import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { CV_TOO_LARGE } from "./lib/cv-validation";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "11mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const requestErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: req.path === "/api/career/cv/analyze" ? CV_TOO_LARGE : "This request is too large. Reduce its size and try again." });
    return;
  }
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "The upload request could not be read. Select your PDF again and retry." });
    return;
  }
  next(error);
};
app.use(requestErrorHandler);

export default app;
