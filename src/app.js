import express from "express"



import cors from "cors"
import cookieParser from "cookie-parser";




const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,

}))

//handling data 

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))


app.use(cookieParser())





//route import 
import userRouter from './routes/user.routes.js'

app.use("/api/v1/users",userRouter)    //we can not use app.get() because here we use a middleware router to reach user.routes.js

export { app }