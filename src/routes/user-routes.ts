import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  updateUser,
} from "../controllers/user-controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", createUser);
router.get("/:userId", requireAuth, getUserById);
router.patch("/:userId", requireAuth, updateUser);
router.delete("/:userId", requireAuth, deleteUser);

export default router;