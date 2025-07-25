import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { History } from "../models/history.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
dotenv.config();


const generateAccessTokenAndRefreshToken= async(userID)=>
{
   try {
        const user= await User.findById(userID);
   
        const accessToken = user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()
       
         user.refreshToken = refreshToken
         await user.save({validateBeforeSave: true})
         return {accessToken,refreshToken}

   } catch (error) {
      throw new ApiError(500,"something went wrong in generating access and refrsh token")
   }
}


const registerUser = asyncHandler
(
    async(req,res) => 
    {
      
         const {email,password} = req.body;
         
         
         const existedUser = await User.findOne({email});

         if(existedUser)
         {
            throw new ApiError(409,"Username or Email already exist")
         }

         const user =await User.create
         (
            {
                email,
                password
            }
         )

         const createdUser =await User.findById(user._id).select("-password -refreshToken");

         if(!createdUser)
         {
            throw  new ApiError(500,"someting went wrong");
         }

        return res.status(201).json
        (
            new ApiResponse(200,createdUser,"user registered succesfully")
        )

        
    }
)
const authRedirect = asyncHandler
( 
   async (req,res) =>
   {
      

     const  userId=req.user._id;
      
      const user = await User.findOne({ _id: userId });
   
      if(!user)
      {
         throw new ApiError(404,"user does not exist")
      }
      
      return res
      .status(200)
      .json(
         new ApiResponse(200,"user exist",{userId})
      )
   }

)

// const PDF = asyncHandler(async (req, res) => {
//    const _id = "66294b1f0ca43b9e5524eb7a";

   
       
//        const pdfPath = await pdf(_id);

      
//        const coverImage = await uploadOnCloudinary(pdfPath);

       
       
      

       
//        return res.status(200).json(new ApiResponse(200, null, "PDF generated and uploaded successfully"));
  
// });



const loginUser = asyncHandler
( 
   async (req,res) =>
   {
      //check email or username exist
      //check password
      //genrate token and make them login
      
      const { email , password } = req.body;
      


      

      if(!email)
      {
         throw new ApiError(400,"email required")
      }

      const user =await User.findOne({email})
      if(!user)
      {
         throw new ApiError(404,"user does not exist")
      }
      const isPasswordValid = await user.isPasswordCorrect(password);

      if(!isPasswordValid )
      {
         throw new ApiError(401,"Password invalid")
      }
      const {accessToken,refreshToken} =await generateAccessTokenAndRefreshToken(user._id);
      
      const loggedIn = await User.findById(user._id).select("-password -refreshToken");

      const options=
      {
         httpOnly:true,
         secure: true
      }

      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
         new ApiResponse(200,
         {
            user: loggedIn,accessToken,refreshToken
         },
         "user logged in successfully"
      )
      )
   }

)

const logoutUser = asyncHandler
(
   async(req,res) =>
   {
     
         const user =await User.findByIdAndUpdate
         (req.user._id,
            {
               $set:{refreshToken:undefined}
            },
            {
               new: true
            }

         )
         
         const options=
         {
            httpOnly:true,
            secure: true
         }

         return res
         .status(200)
         .clearCookie("accessToken",options)
         .clearCookie("refreshToken",options)
         .json(new ApiResponse(200,{},"user logged out"))
         
   }

)

const refreshAccessToken = asyncHandler
(
   async(req,res) =>
   {
     const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken;

     if(!incomingRefreshToken)
     {
       throw new ApiError(401,"Unauthorized request")
     }
     try {
      const docodedToken =jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
 
      const user = await User.findById(docodedToken?._id);
 
      if(!user)
      {
        throw new ApiError(401,"Invaild refreshToken")
      }
 
      if(incomingRefreshToken !== user?.refreshToken)
      {
       throw new ApiError(401,"refresh toke n is expired or used")
      }
 
     const {accessToken,newRefreshToken} = await generateAccessTokenAndRefreshToken(user?._id);
 
      const options =
      {
          httpOnly: true,
          secure: true
      }
      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(
         new ApiResponse(200,
         {
          accessToken,refreshToken:newRefreshToken
         },
         "Access token refreshed"
      )
      )
     } catch (error) {
       throw new ApiError(401,error?.message||"invalid refresh token")
     }

   }
)

const getUserHistory = asyncHandler(
   async(req,res)=>
   {
      const  userId=req.user._id;
      
      const user = await User.findOne({ _id: userId });
      
      if(!user)
      {
         throw new ApiError(404,"user does not exist")
      }
      
      const findAllHistory = await History.find({ user:{ $in: userId } })
      if(!findAllHistory)
      {
         throw new ApiError(400,"you don't have any history")
      }

      return res
      .status(200)
      .json(
         new ApiResponse(200,"Your history",findAllHistory)
      )
   }
)



const generateFoodReport = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  console.log(userId)
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const history = await History.find({
    user: userId,
    createdAt: { $gte: sevenDaysAgo },
  });

  if (!history || history.length === 0) {
    throw new ApiError(404, "No food scan history in the last 7 days");
  }

  // Gemini AI
  const genAI = new GoogleGenerativeAI(process.env.GAPI_KEY);
  const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a professional AI nutritionist. Based on the following 7 days of food intake, provide a comprehensive analysis that includes:

Summary of Nutritional Patterns:

Macronutrient distribution (carbs, proteins, fats)

Micronutrient observations (e.g., fiber, vitamins, minerals)

Recurring food types or habits

Key Insights:

Identify any nutritional imbalances or deficiencies

Highlight any trends (e.g., high sugar intake, low fiber, excessive processed foods)

Personalized Recommendations:

Actionable suggestions to improve overall diet quality

Suggestions for meal improvements or substitutions

Highlight one or two high-impact changes

Use a professional yet accessible tone. Keep the advice grounded in established nutritional guidelines (e.g., WHO, USDA, ICMR) and avoid vague generalities.

Here is the food history data:
${JSON.stringify(history, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const aiText = await response.text();

  // PDF generation
  const tempDir = path.join("public", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const pdfPath = path.join(tempDir, `ai_nutrition_report_${userId}.pdf`);
  console.log("Saving PDF at:", pdfPath);
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);
  doc.fontSize(18).text("AI-Based Nutrition Summary", { align: "center" }).moveDown();
  doc.fontSize(14).text(`User: ${user.name}`).moveDown();
  doc.fontSize(12).text(aiText, { align: "left" });
  doc.end();

  await new Promise((resolve) => writeStream.on("finish", resolve));

  

     const uploadedPDF = await uploadOnCloudinary(pdfPath);
  

  if (!uploadedPDF || !uploadedPDF.secure_url) {
    throw new ApiError(500, "PDF upload failed");
  }
  

  return res.status(200).json(
    new ApiResponse(200, { pdfUrl: uploadedPDF.secure_url }, "AI PDF report generated")
  );
});




export 
{
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   authRedirect,
   getUserHistory,
   generateFoodReport
}