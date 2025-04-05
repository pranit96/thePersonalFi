import nodemailer from 'nodemailer';
import { User } from '@shared/schema';

// Check if required environment variables are set
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

// Create a transport configuration for Google's SMTP service
const transportConfig = {
  service: 'gmail',
  auth: {
    user: SMTP_USER || '',
    pass: SMTP_PASSWORD || ''
  }
};

/**
 * Initializes the email transport - only successful if credentials are provided
 */
function createTransport() {
  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.warn('Email service not configured: Missing SMTP credentials');
    return null;
  }
  
  try {
    return nodemailer.createTransport(transportConfig);
  } catch (error) {
    console.error('Failed to create email transport:', error);
    return null;
  }
}

// Create the transport (will be null if credentials aren't available)
const transporter = createTransport();

/**
 * Sends a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(user: User): Promise<boolean> {
  if (!transporter) {
    console.warn('Skipping welcome email: Email service not configured');
    return false;
  }
  
  try {
    const info = await transporter.sendMail({
      from: `"FinanceTracker" <${SMTP_USER}>`,
      to: user.email || '',
      subject: 'Welcome to FinanceTracker!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366F1;">Welcome to FinanceTracker, ${user.username}!</h2>
          <p>Thank you for registering with our secure financial management application. Your journey to better financial health starts now!</p>
          <p>Here are some tips to get started:</p>
          <ul>
            <li>Set up your monthly salary</li>
            <li>Track your expenses by category</li>
            <li>Create savings goals</li>
            <li>Check out AI-powered insights</li>
          </ul>
          <p>All your financial data is encrypted and secure. You can manage your privacy settings in your account dashboard.</p>
          <p>If you have any questions, feel free to reply to this email.</p>
          <p>Best regards,<br>The FinanceTracker Team</p>
        </div>
      `
    });
    
    console.log('Welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Sends a financial report email with summary information
 */
export async function sendFinancialReportEmail(user: User, report: { 
  totalIncome: number, 
  totalExpenses: number, 
  biggestCategory: string,
  savingsGoalProgress: number 
}): Promise<boolean> {
  if (!transporter || !user.email) {
    console.warn('Skipping report email: Email service not configured or user has no email');
    return false;
  }
  
  try {
    const info = await transporter.sendMail({
      from: `"FinanceTracker" <${SMTP_USER}>`,
      to: user.email,
      subject: 'Your Financial Summary Report',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366F1;">Financial Summary for ${user.username}</h2>
          <p>Here's a summary of your current financial situation:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Total Income:</strong> $${report.totalIncome.toFixed(2)}</p>
            <p><strong>Total Expenses:</strong> $${report.totalExpenses.toFixed(2)}</p>
            <p><strong>Biggest Spending Category:</strong> ${report.biggestCategory}</p>
            <p><strong>Savings Goal Progress:</strong> ${report.savingsGoalProgress}%</p>
          </div>
          
          <p>Log in to your account to see detailed analytics and personalized insights.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    });
    
    console.log('Financial report email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send financial report email:', error);
    return false;
  }
}

/**
 * Sends a password reset email with a token link
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  if (!transporter) {
    console.warn('Skipping password reset email: Email service not configured');
    return false;
  }
  
  // In production, this would be a link to the frontend with the token as a parameter
  const resetLink = `https://app.financetracker.com/reset-password?token=${resetToken}`;
  
  try {
    const info = await transporter.sendMail({
      from: `"FinanceTracker" <${SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366F1;">Password Reset Request</h2>
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <p>To reset your password, click the button below:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #6366F1; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
        </div>
      `
    });
    
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

/**
 * Sends a data export notification email
 */
export async function sendDataExportEmail(user: User, downloadLink: string): Promise<boolean> {
  if (!transporter || !user.email) {
    console.warn('Skipping data export email: Email service not configured or user has no email');
    return false;
  }
  
  try {
    const info = await transporter.sendMail({
      from: `"FinanceTracker" <${SMTP_USER}>`,
      to: user.email,
      subject: 'Your Data Export is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366F1;">Your Data Export is Ready</h2>
          <p>Hello ${user.username},</p>
          <p>Your requested data export is now ready. You can download your data by clicking the button below:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${downloadLink}" style="background-color: #6366F1; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Your Data</a>
          </div>
          
          <p>For security reasons, this download link will expire in 24 hours.</p>
          <p>If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
          <p style="word-break: break-all; color: #666;">${downloadLink}</p>
          <p>If you did not request this data export, please contact our support team immediately.</p>
        </div>
      `
    });
    
    console.log('Data export email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send data export email:', error);
    return false;
  }
}

/**
 * Checks if the email service is configured and ready to send emails
 */
export function isEmailServiceConfigured(): boolean {
  return transporter !== null;
}