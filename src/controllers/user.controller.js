import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  const existedUser = User.findOne({
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
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

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
  return (
    res.status(201),
    json(new ApiResponse(200, createdUser, "User Registered Successfully"))
  );
});

export { registerUser };
