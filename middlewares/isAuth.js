import { User } from "../models/User.js";

export const isAuth = async (req, res, next) => {
  try {
    console.log('Auth check - Session:', req.session ? 'exists' : 'none');
    console.log('Auth check - Session:', req.session);
    console.log('Auth check - Headers:', req.headers);
    // console.log('Auth check - Cookies:', req.cookies);

    // 1. Check for session-based login (Google/Passport)
    if (req.session && req.session.user) {
      console.log('Auth: Session-based authentication successful');
      const user = await User.findById(req.session.user._id);
      if (!user) {
        return res.status(401).json({ 
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }
      req.user = {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      };
      return next();
    }

    // 2. Check for token-based authentication
    const token = req.headers.token || req.headers.authorization?.split(' ')[1];
    if (token) {
      console.log('Auth: Token-based authentication attempt');
      const user = await User.findOne({ token });
      if (!user) {
        return res.status(401).json({ 
          message: "Invalid token",
          code: "INVALID_TOKEN"
        });
      }
      req.user = {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      };
      return next();
    }

    // 3. Passport user
    if (req.user) {
      console.log('Auth: Passport user found');
      return next();
    }

    // 4. Not authenticated
    console.log('Auth: No authentication found');
    return res.status(401).json({ 
      message: "Authentication required: Please login to continue",
      code: "AUTH_REQUIRED"
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ 
      message: "Authentication system error", 
      error: error.message,
      code: "AUTH_SYSTEM_ERROR"
    });
  }
};

export const isAdmin = (req, res, next) => {
  try {
    console.log('Admin check - User role:', req.user?.role);
    
    if (!req.user) {
      console.log('Admin check: No user found in request');
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    if (req.user.role !== "admin") {
      console.log('Admin check: User is not admin');
      return res.status(403).json({
        message: "Access denied: Admin privileges required",
        code: "ADMIN_REQUIRED"
      });
    }

    console.log('Admin check: Access granted');
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({
      message: "Admin verification failed",
      error: error.message,
      code: "ADMIN_CHECK_ERROR"
    });
  }
};
