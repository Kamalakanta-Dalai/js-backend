import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefrshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //? Saving refresh Token to database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went while generating refresh and access token"
    );
  }
};

//TODO: For Registering user
const registerUser = asyncHandler(async (req, res) => {
  //TODO: Get users details from frontend (while testing from postman)
  const { fullName, email, username, password } = req.body;
  console.log("email:", email);

  // TODO: Validation (Proper email or not , name shouldn't be empty etc)
  //! %%%%%%%%%%%% Can also be done like this %%%%%%%%%%%%
  // if (fullName == "") {
  //   throw new ApiError(400, "Please provide your Full Name");
  // }
  //!%%%%%%%%%%%%% But there will be so many if-else %%%%%
  //? map() used to transform each elements of an array but some() used to check conditions for each element of an array
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  //TODO: check if user already registered or not: can be done via username & email
  const existedUser = await User.findOne({
    $or: [{ email }, { username }], //? MongoDB query to perform logical OR operation
  });

  if (existedUser) {
    throw new ApiError(
      409,
      `Email address "${email}" or Username "${username}" already exists`
    );
  }

  //TODO: check for images,check for avatar(whether user has send it or not)
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  //TODO: If user has send any images or file then upload it to cloudinary, check avatar is uploaded or not

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(
      400,
      "Something went wrong while uploading Avatar Image"
    );
  }

  //TODO: create user object - create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //TODO: remove password and refresh token field response
  //? To check whether User successfully created or not
  //! select() method tells while finding id which info should come (+) which shouldn't (-)

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //TODO: check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while rgistering user!");
  }

  //TODO: return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

//TODO: For logging In

const loginUser = asyncHandler(async (req, res) => {
  //TODO: req body -> data
  const { email, username, password } = req.body;

  //TODO: validate input fields username or email based
  if (!(username || email)) {
    throw new ApiError(400, "Please provide either username or email!");
  }

  //TODO: find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "Invalid Credentials");
  }

  //TODO: password check
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }
  //TODO: if password correct - access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefrshTokens(
    user._id
  );
  //TODO: send cookie
  //here we can directly update the user or can call the database(User)
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully"
      )
    );
});

//TODO: Log out user
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Loggedout Successfuly"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Token");
    }

    if (!incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or already used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefrshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, optons)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid Refresh Token" || error?.message);
  }
});

//TODO: Changing Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Wrong password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

//TODO: current user fetching
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

//TODO: Fullname and email update
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  //Check for existing full name
  if (!fullName || !email) {
    throw new ApiError(
      400,
      "Please provide both a full name and an email address"
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//TODO: Updating files
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "No file provided");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(500, "Failed to upload image on cloudinary");
  }

  //? updating the user object(or document)
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res.status(200).json(200, user, "Avatar updated successfully");
});

//TODO: Updating coverImage
const updateUserCoverImage = asyncHandler(async (req, res) => {
  //? getting file path(url)
  const coverImageLocalPath = req.file?.path;

  //? checking
  if (!coverImageLocalPath) {
    throw new ApiError(400, "No file Provided");
  }

  //? Upoading on cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  //? updating the user object(or document on database)
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res.status(200).json(200, user, "Cover Image updated successfully");
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
