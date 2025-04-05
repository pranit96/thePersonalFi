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
  const sessionSecret = process.env.SESSION_SECRET || 
    crypto.randomBytes(32).toString('hex'); // Fallback for dev environments only
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
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
    }),
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
      const { username, password, email } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create new user
      const user = await storage.createUser({
        username,
        password,
        email,
        dataEncryptionEnabled: true,
        dataSharingEnabled: false,
        anonymizedAnalytics: true
      });
      
      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json({ 
          id: user.id,
          username: user.username,
          email: user.email,
          dataEncryptionEnabled: user.dataEncryptionEnabled,
          dataSharingEnabled: user.dataSharingEnabled,
          anonymizedAnalytics: user.anonymizedAnalytics
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
          username: user.username,
          email: user.email,
          dataEncryptionEnabled: user.dataEncryptionEnabled,
          dataSharingEnabled: user.dataSharingEnabled,
          anonymizedAnalytics: user.anonymizedAnalytics
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
      username: user.username, 
      email: user.email,
      dataEncryptionEnabled: user.dataEncryptionEnabled,
      dataSharingEnabled: user.dataSharingEnabled,
      anonymizedAnalytics: user.anonymizedAnalytics
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
      username: user.username, 
      email: user.email,
      dataEncryptionEnabled: user.dataEncryptionEnabled,
      dataSharingEnabled: user.dataSharingEnabled,
      anonymizedAnalytics: user.anonymizedAnalytics
    });
  });
}