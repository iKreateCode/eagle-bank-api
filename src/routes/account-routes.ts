import { Router } from "express";
import {
  createAccount,
  listAccounts,
  getAccountByNumber,
  updateAccount,
  deleteAccount,
} from "../controllers/account-controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, createAccount);
router.get("/", requireAuth, listAccounts);
router.get("/:accountNumber", requireAuth, getAccountByNumber);
router.patch("/:accountNumber", requireAuth, updateAccount);
router.delete("/:accountNumber", requireAuth, deleteAccount);

export default router;
