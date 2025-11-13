import { asyncHandler } from "../utils/asyncHandler.js";
//throw APIerror
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"

//upload file in cloudinary
import {  uploadOnCloudinary } from "../utils/cloudinary.js";
const registerUser = asyncHandler( async (req,res) => {
    
    //get user details
    const {fullName,email,username,password} = req.body
    console.log("email :",email);

 //validate

    // if(fullName === ""){
    //     throw new ApiError(400, "fullname is required");
    // }
    
    if(
        [fullName,email,username,password].some((field) => 
           field?.trim() === "")   
        ){
                throw new ApiError(400,"All field are required");
        }

 //check user exist or not
    const existedUser = User.findOne({
        $or: [{ username },{ email }]    //email OR username any one is exist
    })

    if(existedUser){
        throw new ApiError (409,"User With email and username already exist")
    }

//check image & avatar

   const avatarLocalPath = req.files?.avatar[0]?.path ;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;


   if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
   }

//uplod in cloudinary
   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
       throw new ApiError(400,"Avatar file is required");
  }

//Create Object and stored in database
  const user = await User.create({
    fullName,
    avatar : avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })
  await User.findById(user._id)

//remove user password and refreshtoken 
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

//check user creation
  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user")
  }

//response

return res.status(201).json(
    new ApiResponse(200, createdUser,"User registered Successfully")
)
})


export { registerUser }