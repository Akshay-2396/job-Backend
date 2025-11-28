
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloud.js";

export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, adharcard, pancard, role } = req.body;

    if (!fullname || !email || !phoneNumber || !password || !role || !pancard || !adharcard) {
      return res.status(400).json({ message: "Missing required fields", success: false });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already exists", success: false });
    }

    if (await User.findOne({ adharcard })) {
      return res.status(400).json({ message: "Adhar number already exists", success: false });
    }

    if (await User.findOne({ pancard })) {
      return res.status(400).json({ message: "Pan number already exists", success: false });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Profile image is required", success: false });
    }

    const fileUri = getDataUri(req.file);
    const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullname,
      email,
      phoneNumber,
      adharcard,
      pancard,
      password: hashedPassword,
      role,
      profile: {
        profilePhoto: cloudResponse.secure_url,
      },
    });

    await newUser.save();

    return res.status(201).json({
      message: `Account created successfully for ${fullname}`,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error registering user", success: false });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields", success: false });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    if (user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({
        message: "You don't have the necessary role",
        success: false,
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    const sanitizedUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      adharcard: user.adharcard,
      pancard: user.pancard,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        message: `Welcome back ${user.fullname}`,
        user: sanitizedUser,
        success: true,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error login failed", success: false });
  }
};

export const logout = async (req, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error logging out", success: false });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, bio, skills } = req.body;

    const user = await User.findById(req.id);
    if (!user) return res.status(404).json({ message: "User not found", success: false });

    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bio) user.profile.bio = bio;
    if (skills) user.profile.skills = skills.split(",");

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: "resume",
            resource_type: "raw",
          },
          (err, result) => (err ? reject(err) : resolve(result))
        ).end(req.file.buffer);
      });

      user.profile.resume = uploadResult.secure_url;
      user.profile.resumeOriginalname = req.file.originalname;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error updating profile", success: false });
  }
};















































































