import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error-handler";
import userRoutes from "./routes/user-routes";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/v1/users", userRoutes);

app.use(errorHandler);