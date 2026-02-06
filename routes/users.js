import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile } from "../controllers/userController.js";

const router = Router();

router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);

export default router;
