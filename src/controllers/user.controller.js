import { asyncHandler } from "../utils/asyncHandler.js";
//throw APIerror
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"

//upload file in cloudinary
import {  uploadOnCloudinary } from "../utils/cloudinary.js";

import jwt from "jsonwebtoken";



const generateAccessAndRefereshTokens = async (userId) => {
      try {
        const user =  await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return {accessToken,refreshToken}
        
      } catch (error) {
         throw new ApiError(500,"Something went wrong while generating referesh and access token")
      }
}




const registerUser = asyncHandler( async (req,res) => {
    
    //get user details
    const {fullName,email,username,password} = req.body
    // console.log("email :",email);

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
    const existedUser = await User.findOne({
        $or: [{ username },{ email }]    //email OR username any one is exist
    })

    if(existedUser){
        throw new ApiError (409,"User With email and username already exist")
    }

//check image & avatar

   const avatarLocalPath = req.files?.avatar[0]?.path ;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;


   if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
   }

   let  coverImageLocalPath
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
    coverImageLocalPath = req.files.coverImage[0].path;
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



const loginUser = asyncHandler( async (req,res) => {
    //access user data
         const {email,username,password} = req.body;
    //check username or email
         if(!username && !email){
          throw new ApiError(400,"username or password is required");
         }
    //find
    const user = await User.findOne({
      $or: [{username},{email}]
    })

    if(!user){
      throw new ApiError(404,"user does not exist");
    }
  //check user password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
      throw new ApiError(401,"Invalid user credentials");
    }

//access and refresh token
  const {accessToken,refreshToken} =  await generateAccessAndRefereshTokens(user._id)

  const loggedInUser = await User.findById(user._id).
  select("-password -refreshToken")


//we cannot modify cookie in frontend only modify allow through server...so this is
    const options = {
       httpOnly: true,
       secure: true
    } 

   return res.status(200)
   .cookie("accessToken",accessToken,options) 
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(200,
      {
             user : loggedInUser,accessToken,refreshToken
      },
      "User loggedIn successfully"
   )
   )

})



//logout user
const logoutUser = asyncHandler(async (req,res) => {
  await  User.findByIdAndUpdate(
    req.user._id,{
            $set: {
              refreshToken: undefined
            }
    },{
      new: true
    }
   )

    const options = {
       httpOnly: true,
       secure: true
    } 

    return res.status(200).clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

//refresh access token 
const refereshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
      throw new ApiError(401,"unauthorized request")
    }


  try {
      const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
     const user = await User.findById(decodedToken?._id) 
  
     if(!user){
       throw new ApiError(401,"Invalid refresh token")
     }
  
  //match token
     if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token is expired")
     }
  
  const options = {
    httpOnly : true,
    secure: true
  }
    const{accessToken,newrefreshToken} = await generateAccessAndRefereshTokens(user._id)
  
    return res.status(200)
    .cookie("accessToken",accessToken)
    .cookie("refreshToken",newrefreshToken)
    .json(new ApiResponse(200,{accessToken,newrefreshToken},"Access Token refreshed"))
  } catch (error) {
     throw new ApiError(401,error?.message || "invalid refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})


const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }



    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})




export { registerUser, loginUser , logoutUser ,refereshAccessToken , changeCurrentPassword , getCurrentUser,updateAccountDetails, updateUserAvatar,updateUserCoverImage }