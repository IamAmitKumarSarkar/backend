import { Router } from "express";
import { loginUser, logoutUser, registerUser} from "../controllers/user.controller.js";


//file handling
import {upload} from "../middlewares/multer.middleware.js"
//import { verify } from "jsonwebtoken";
import { verifyJWT } from "../middlewares/auth.middleware.js";
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

router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(
    verifyJWT,
    logoutUser)

export default router