import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"




const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique : true,
        lowercase : true,
        trim : true,
        index : true

    },
    email : {
        type: String,
        required: true,
        unique : true,
        lowercase : true,
        trim : true
    },
    fullName: {
        type: String,
        required: true,
        trim : true,
        index : true
    },
    avatar: {
        type: String,   // here we use cloudinery url(third party)
        required: true 
    },
    coverImage: {
        type: String     //cloudinary url
    },
    watchHistory : [
        {
            type :Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required'] //castom message
    },
    refreshToken:{
        type: String
    }

},{timestamps:true})










// hashing the password(pre is a hook provided by mongoose....pre is a middleware so should have access of next-->next flag)
userSchema.pre("save",async function (next) {
    //check password change or not
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password,10)  //how many round -->10 
    next()
})


//check password with encripted password
userSchema.methods.isPasswordCorrect = async function (password){

   return await bcrypt.compare(password,this.password)  //this is creptography computation much take some amount of time so use await
}

//genarate access token

userSchema.methods.generateAccessToken = function (){
    //generate jwt assign in payload
    return jwt.sign(
        {
            _id: this._id,
            email:this.email,
            username:this.username,
            fullName : this.fullName

        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY 
        }
    )
}
userSchema.methods.generateRefreshToken = function (){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}






export const User = mongoose.model('User',userSchema)