import { Router } from "express";
import { SendEmail} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verfiyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/sendEmail").post(SendEmail);


export default router