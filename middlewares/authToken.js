const jwt = require("jsonwebtoken");
const Student = require("../models/studentSchema");
require("dotenv").config();

const authenticateToken = (mreq, mres, next) => {
  return next()
  const authHeader = mreq.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const refreshToken = mreq.body.rtoken;

  if (token == null) return mres.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return mres.sendStatus(401)

    //TODO: implement refresh token as well
    // {
    //   //AccessToken is false or expired so we back to check the refresh token
    //   if (user.role == "student") {
    //     Student.findById(user._id).then((res) => {
    //       jwt.verify(
    //         refreshToken,
    //         process.env.REFRESH_TOKEN_SECRET,
    //         (err, user) => {
    //           if (err) return mres.sendStatus(403);

    //           //Create new access token for the user

    //           const em = {
    //             _id: res_user._id,
    //             email: res_user.email,
    //             role: role,
    //             privileges: res_user.privileges,
    //             name: res_user.name,
    //             isAvailable: res_user.isAvailable,
    //             subscription_state: res_user.subscription_state,
    //           };
    //           const accessToken = jwt.sign(
    //             em,
    //             process.env.ACCESS_TOKEN_SECRET,
    //             { expiresIn: "15m" }
    //           );

    //           const user = res_user.toObject(); //IMPORTANT
    //           user.accessToken = accessToken;
    //         }
    //       );
    //     });
    //   } else if (user.role == "instructor") {
    //   }
    // }

    mreq.user = user;
    next();
  });
};

module.exports = authenticateToken;
