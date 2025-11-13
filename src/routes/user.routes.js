import { Router } from "express";
import { registerUser} from "../controllers/user.controller.js";


//file handling
import {upload} from "../middlewares/multer.middleware.js"
const router = Router();


//use middleware to upload images and files
router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]),
    registerUser
)

export default router