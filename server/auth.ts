import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { verifyPassword } from "./utils/encryption";
import crypto from "crypto";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  // Get or generate a strong session secret
  let sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    console.warn('⚠️ SESSION_SECRET not provided in environment variables. Generating a random one for this session...');
    sessionSecret = crypto.randomBytes(32).toString('hex'); 
  } else {
    console.log('✓ SESSION_SECRET is properly configured');
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,            // Prevent client-side JS from reading the cookie
      maxAge: 1000 * 60 * 60 * 8, // 8 hours - shorter sessions for security
      sameSite: 'strict'         // Protection against CSRF
    },
    name: 'fin_session_id',     // Custom name for the session cookie
    rolling: true,              // Reset expiration countdown on activity
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',    // Use email field as the username
        passwordField: 'password'   // Keep the password field the same
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Incorrect email address" });
          }
          
          // Verify password using our secure implementation
          const isValid = verifyPassword(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Incorrect password" });
          }
          
          // Update last login time
          // Note: In a full implementation, you'd update the user record here
          
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register route
  app.post("/api/register", async (req, res, next) => {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        currency, 
        defaultSalary,
        dataEncryptionEnabled,
        dataSharingEnabled,
        anonymizedAnalytics
      } = req.body;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email address already exists" });
      }
      
      // Create new user
      const user = await storage.createUser({
        email,
        password,
        firstName: firstName || null,
        lastName: lastName || null,
        profilePicture: null,
        currency: currency || "USD",
        defaultSalary: defaultSalary || 0,
        dataEncryptionEnabled: dataEncryptionEnabled ?? true,
        dataSharingEnabled: dataSharingEnabled ?? false,
        anonymizedAnalytics: anonymizedAnalytics ?? true
      });
      
      // Create initial salary record if defaultSalary is provided
      if (defaultSalary && defaultSalary > 0) {
        try {
          await storage.createSalaryRecord({
            amount: defaultSalary,
            source: "Primary Income",
            userId: user.id,
            encryptedData: null
          });
        } catch (salaryError) {
          console.error("Failed to create initial salary record:", salaryError);
          // Continue with registration even if salary record creation fails
        }
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json({ 
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          currency: user.currency,
          defaultSalary: user.defaultSalary,
          dataEncryptionEnabled: user.dataEncryptionEnabled
        });
      });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ 
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          currency: user.currency,
          defaultSalary: user.defaultSalary,
          dataEncryptionEnabled: user.dataEncryptionEnabled
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as SelectUser;
    return res.json({ 
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      currency: user.currency,
      defaultSalary: user.defaultSalary,
      dataEncryptionEnabled: user.dataEncryptionEnabled
    });
  });

  // Update user settings
  app.put("/api/user/settings", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // In a real implementation, you would update the user settings here
    // For now, we'll just return the current user
    const user = req.user as SelectUser;
    return res.json({ 
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      currency: user.currency,
      defaultSalary: user.defaultSalary,
      dataEncryptionEnabled: user.dataEncryptionEnabled
    });
  });
}