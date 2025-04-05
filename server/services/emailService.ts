import nodemailer from 'nodemailer';
import { User } from '@shared/schema';

// Configure email transport with provided SMTP credentials
const transporter = createTransport();

/**
 * Initializes the email transport - only successful if credentials are provided
 */
function createTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('Email service not configured: Missing SMTP credentials');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

/**
 * Sends a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(user: User): Promise<boolean> {
  if (!transporter) return false;
  if (!user.email) return false;

  try {
    const name = user.firstName ? `${user.firstName}` : 'there';
    
    await transporter.sendMail({
      from: `"Finance Tracker" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Welcome to your Financial Journey!',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to Finance Tracker!</h1>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">Hello ${name},</p>
          
          <p style="font-size: 16px; line-height: 1.5;">Thank you for joining Finance Tracker! We're excited to help you take control of your financial journey.</p>
          
          <p style="font-size: 16px; line-height: 1.5;">Here's what you can do with your new account:</p>
          
          <ul style="font-size: 16px; line-height: 1.5;">
            <li>Track your monthly salary and weekly transactions</li>
            <li>Set and monitor savings goals</li>
            <li>Get AI-powered insights about your spending habits</li>
            <li>Upload financial documents for automated parsing</li>
            <li>Visualize your financial data with advanced analytics</li>
          </ul>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #6366F1;">
            <p style="margin: 0; font-size: 16px;">Your data is fully encrypted and secure. You have complete control over your information at all times.</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">If you have any questions or need assistance, just reply to this email.</p>
          
          <p style="font-size: 16px; line-height: 1.5;">Happy tracking!</p>
          
          <p style="font-size: 16px; line-height: 1.5;">The Finance Tracker Team</p>
          
          <div style="border-top: 1px solid #eaeaea; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #666;">
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      `
    });
    
    console.log(`Welcome email sent to ${user.email}`);
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
  topCategories: {category: string, amount: number}[],
  savingsRate: number,
  goalProgress: {name: string, progress: number}[]
}): Promise<boolean> {
  if (!transporter) return false;
  if (!user.email) return false;
  
  try {
    // Calculate savings amount
    const savingsAmount = report.totalIncome - report.totalExpenses;
    const name = user.firstName ? `${user.firstName}` : 'there';
    
    await transporter.sendMail({
      from: `"Finance Tracker" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Your Monthly Financial Summary',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Your Monthly Financial Summary</h1>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">Hello ${name},</p>
          
          <p style="font-size: 16px; line-height: 1.5;">Here's your financial summary for the month:</p>
          
          <div style="margin: 25px 0; background-color: #f9fafb; border-radius: 8px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <div style="flex: 1;">
                <p style="margin: 0; color: #6B7280; font-size: 14px;">Total Income</p>
                <p style="margin: 5px 0 0; font-size: 20px; font-weight: 600; color: #10B981;">$${report.totalIncome.toFixed(2)}</p>
              </div>
              <div style="flex: 1;">
                <p style="margin: 0; color: #6B7280; font-size: 14px;">Total Expenses</p>
                <p style="margin: 5px 0 0; font-size: 20px; font-weight: 600; color: #EF4444;">$${report.totalExpenses.toFixed(2)}</p>
              </div>
              <div style="flex: 1;">
                <p style="margin: 0; color: #6B7280; font-size: 14px;">Savings</p>
                <p style="margin: 5px 0 0; font-size: 20px; font-weight: 600; color: ${savingsAmount >= 0 ? '#10B981' : '#EF4444'};">
                  $${savingsAmount.toFixed(2)}
                </p>
              </div>
            </div>
            
            <div style="margin-top: 20px;">
              <p style="margin: 0 0 10px; color: #6B7280; font-size: 14px;">Savings Rate: ${report.savingsRate.toFixed(1)}%</p>
              <div style="height: 8px; background-color: #E5E7EB; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(report.savingsRate, 100)}%; background-color: #10B981;"></div>
              </div>
            </div>
          </div>
          
          <h2 style="font-size: 18px; margin: 25px 0 15px;">Top Spending Categories</h2>
          
          <div style="margin-bottom: 25px;">
            ${report.topCategories.map(cat => `
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-size: 16px;">${cat.category}</span>
                <span style="font-size: 16px; font-weight: 600;">$${cat.amount.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          <h2 style="font-size: 18px; margin: 25px 0 15px;">Goal Progress</h2>
          
          <div>
            ${report.goalProgress.map(goal => `
              <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-size: 16px;">${goal.name}</span>
                  <span style="font-size: 16px;">${goal.progress.toFixed(1)}%</span>
                </div>
                <div style="height: 8px; background-color: #E5E7EB; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: ${Math.min(goal.progress, 100)}%; background-color: #6366F1;"></div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.APP_URL || 'https://finance-tracker.app'}" style="display: inline-block; background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Full Dashboard</a>
          </div>
          
          <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #666;">
            <p>This is an automated message from Finance Tracker. Your data is encrypted and secure.</p>
          </div>
        </div>
      `
    });
    
    console.log(`Financial report email sent to ${user.email}`);
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
  if (!transporter) return false;
  
  const resetUrl = `${process.env.APP_URL || 'https://finance-tracker.app'}/reset-password?token=${resetToken}`;
  
  try {
    await transporter.sendMail({
      from: `"Finance Tracker" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Reset Your Password</h1>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          
          <p style="font-size: 16px; line-height: 1.5;">To reset your password, click the button below:</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all;">
            <a href="${resetUrl}" style="color: #6366F1; text-decoration: none;">${resetUrl}</a>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">This link will expire in 1 hour for security reasons.</p>
          
          <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #666;">
            <p>If you didn't request a password reset, please contact support immediately.</p>
          </div>
        </div>
      `
    });
    
    console.log(`Password reset email sent to ${email}`);
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
  if (!transporter) return false;
  if (!user.email) return false;

  try {
    const name = user.firstName ? `${user.firstName}` : 'there';
    
    await transporter.sendMail({
      from: `"Finance Tracker" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Your Financial Data Export',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Your Data Export is Ready</h1>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">Hello ${name},</p>
          
          <p style="font-size: 16px; line-height: 1.5;">Your requested data export is now ready. You can download your financial data using the link below:</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${downloadLink}" style="display: inline-block; background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Download Your Data</a>
          </div>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 16px; font-weight: 500;">Security Notice</p>
            <p style="margin: 10px 0 0; font-size: 14px;">This link will expire in 24 hours for security reasons. Your data is exported in an encrypted format for your protection.</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">Thank you for using Finance Tracker. We prioritize your data privacy and security.</p>
          
          <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #666;">
            <p>If you didn't request this data export, please contact support immediately as someone may have unauthorized access to your account.</p>
          </div>
        </div>
      `
    });
    
    console.log(`Data export email sent to ${user.email}`);
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
  return !!transporter;
}