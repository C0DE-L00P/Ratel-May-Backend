const authorized = (condition1, condition2) => {
  return (mreq, mres, next) => {
    if (
      (mreq.user.role !==condition1) ||
      (!condition2.includes(mreq.user.privilages))
    )
      return mres.sendStatus(403);

    next();
  };
};

module.exports = authorized;
