import { Groq } from 'groq-sdk';
import { Transaction, SalaryRecord, Goal, SavingsRecord } from '@shared/schema';
import { decrypt } from '../utils/encryption';
import { rateLimiter, RATE_LIMITS } from './rateLimiterService';

// Initialize Groq client using official SDK
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Models to use - select based on task complexity and rate limits
const FINANCIAL_MODEL = 'llama3-70b-8192';  // High-performance model for financial analysis
const PDF_MODEL = 'llama3-8b-8192';         // Lower-tier model for PDF processing to save quota

/**
 * Formats a financial data summary for AI processing
 */
function formatFinancialData(
  transactions: Transaction[],
  salaryRecords: SalaryRecord[],
  goals: Goal[],
  savingsRecords: SavingsRecord[]
) {
  // Decrypt sensitive data where applicable and normalize transaction amounts
  // Process transactions, ensuring expense/income semantics are clear to the AI
  const processedTransactions = transactions.map(t => {
    // Make a copy of the transaction
    const processedT = { ...t };
    
    // Add a clear type field to help the AI understand the nature of the transaction
    processedT.type = t.amount < 0 ? 'expense' : 'income';
    
    // Add absolute amount for easier analysis
    processedT.absoluteAmount = Math.abs(t.amount);
    
    // Include decrypted data if available
    if (t.encryptedData) {
      processedT.decryptedData = JSON.parse(decrypt(t.encryptedData));
    }
    
    return processedT;
  });
  
  const processedSalary = salaryRecords.map(s => ({
    ...s,
    ...(s.encryptedData ? { decryptedData: JSON.parse(decrypt(s.encryptedData)) } : {})
  }));

  const processedGoals = goals.map(g => ({
    ...g,
    ...(g.encryptedData ? { decryptedData: JSON.parse(decrypt(g.encryptedData)) } : {})
  }));

  // Format data for the AI to process
  return {
    transactions: processedTransactions,
    salary: processedSalary,
    goals: processedGoals,
    savings: savingsRecords
  };
}

/**
 * Generate spending insights based on transaction history
 */
export async function generateSpendingInsights(
  transactions: Transaction[],
  salaryRecords: SalaryRecord[] = [],
  goals: Goal[] = [],
  savingsRecords: SavingsRecord[] = []
) {
  try {
    // Check rate limit for general insights
    if (!rateLimiter.canProceed('GENERAL_INSIGHTS', RATE_LIMITS.GENERAL_INSIGHTS)) {
      console.warn('Rate limit exceeded for generating spending insights');
      throw new Error('AI rate limit exceeded for generating insights. Please try again in an hour when the rate limit resets.');
    }
    // Prepare data
    const financialData = formatFinancialData(transactions, salaryRecords, goals, savingsRecords);
    
    // Create a summary of the data for context
    const transactionsByCategory = transactions.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = 0;
      acc[t.category] += t.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = salaryRecords.reduce((sum, s) => sum + s.amount, 0);
    
    // Calculate monthly averages for more context
    const lastThreeMonthsTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return transDate >= threeMonthsAgo;
    });
    
    // Get recurring merchants (appears more than once)
    const merchantCounts = lastThreeMonthsTransactions.reduce((acc, t) => {
      const merchant = t.merchant || t.payee || 'Unknown';
      acc[merchant] = (acc[merchant] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const recurringMerchants = Object.entries(merchantCounts)
      .filter(([_, count]) => count > 1)
      .map(([merchant]) => merchant)
      .slice(0, 5); // Top 5 recurring merchants
    
    // Format the prompt for the AI with more personalized context
    const prompt = `
    As a personal financial advisor, analyze this user's financial data and provide 3-5 highly personalized actionable insights:

    SUMMARY:
    Total spending: $${Math.abs(totalSpending).toFixed(2)}
    Total income: $${totalIncome.toFixed(2)}
    Savings rate: ${totalIncome > 0 ? ((totalIncome - Math.abs(totalSpending)) / totalIncome * 100).toFixed(1) : 0}%
    
    SPENDING BY CATEGORY:
    ${Object.entries(transactionsByCategory)
      .map(([category, amount]) => `- ${category}: $${Math.abs(amount).toFixed(2)} (${(Math.abs(amount)/Math.abs(totalSpending)*100).toFixed(1)}%)`)
      .join('\n')}
    
    FREQUENT MERCHANTS:
    ${recurringMerchants.join(', ')}
    
    GOALS:
    ${goals.map(g => `- ${g.name || 'Unnamed goal'}: $${g.currentAmount || 0}/$${g.amount || 0}`).join('\n')}
    
    Based on this information, please provide:
    1. Personalized insights about spending patterns that are specific to this user's data
    2. Targeted savings opportunities based on their specific spending categories
    3. Actionable recommendations tied to their frequent merchants and spending habits
    4. Goal-specific advice to help them reach their financial targets faster
    5. If appropriate, identify potential subscription services they could optimize
    
    Format your response as a JSON object with these fields:
    {
      "insights": [
        {
          "title": "Short, personalized and actionable title",
          "description": "Detailed insight explanation with specific numbers and percentages from their data",
          "type": "spending_pattern|saving_opportunity|goal_progress|warning",
          "actionText": "Specific, concrete action the user can take"
        }
      ]
    }
    
    IMPORTANT: 
    - Do NOT treat negative transaction amounts as problematic - they are normal expenses
    - Include specific numbers in your insights (e.g., "You spent $X on category Y")
    - Make recommendations relevant to the user's actual spending patterns
    - Do not include generic advice that could apply to anyone
    - Only return valid JSON with no additional text or explanation
    `;

    // Call the AI model
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: FINANCIAL_MODEL,
      temperature: 0.2,
      max_tokens: 1500,
      top_p: 0.8,
    });

    // Parse the AI response and validate it's proper JSON
    const content = response.choices[0]?.message?.content || '';
    try {
      // Extract JSON from the response (in case it has markdown formatting)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        [null, content];
      const jsonContent = jsonMatch[1] || content;
      const insights = JSON.parse(jsonContent);
      return insights.insights || [];
    } catch (error) {
      console.error('Failed to parse AI insights:', error);
      console.error('AI response was:', content);
      return [];
    }
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return [];
  }
}

/**
 * Generate personalized financial advice based on user goals and spending
 */
export async function generatePersonalizedAdvice(
  goals: Goal[],
  transactions: Transaction[],
  salaryRecords: SalaryRecord[]
) {
  try {
    // Check rate limit for goal advice
    if (!rateLimiter.canProceed('GOAL_ADVICE', RATE_LIMITS.GOAL_ADVICE)) {
      console.warn('Rate limit exceeded for generating goal advice');
      throw new Error('AI rate limit exceeded for goal advice. Please try again in an hour when the rate limit resets.');
    }
    
    // Calculate current financial situation with normalized values for expenses
    const monthlyIncome = salaryRecords.length > 0 
      ? salaryRecords[salaryRecords.length - 1].amount 
      : 0;
    
    // Get current month's transactions
    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    
    // Calculate expenses (negative amounts) and income (positive amounts) separately
    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const monthlyIncomeFromTransactions = currentMonthTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Combine income sources
    const totalMonthlyIncome = monthlyIncome + monthlyIncomeFromTransactions;
    
    // Calculate savings rate
    const savingsRate = totalMonthlyIncome > 0 
      ? ((totalMonthlyIncome - monthlyExpenses) / totalMonthlyIncome * 100).toFixed(1) 
      : '0.0';
    
    // Break down spending by category for specific recommendations
    const categorySpending = transactions
      .filter(t => t.amount < 0)
      .reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        if (!acc[category]) acc[category] = 0;
        acc[category] += Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);
    
    // Sort categories by spending amount
    const topCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Format goals for AI input with more context
    const formattedGoals = goals.map(g => {
      // Use the "amount" field as targetAmount and handle null values
      const targetAmount = g.amount || 0;
      const currentAmount = g.currentAmount || 0;
      const progress = targetAmount > 0 ? ((currentAmount / targetAmount) * 100).toFixed(1) + '%' : '0.0%';
      
      // Calculate average monthly contribution needed
      const remaining = targetAmount - currentAmount;
      const monthsNeeded = remaining > 0 && totalMonthlyIncome > monthlyExpenses
        ? Math.ceil(remaining / (totalMonthlyIncome - monthlyExpenses))
        : 'Infinity';
      
      return {
        name: g.name || 'Unnamed Goal',
        targetAmount: targetAmount,
        currentAmount: currentAmount,
        progress: progress,
        remaining: remaining.toFixed(2),
        estimatedMonthsToCompletion: monthsNeeded,
        priority: g.priority || 'Medium'
      };
    });
    
    // Create the prompt with much more personalized context
    const prompt = `
    As a personal financial advisor, provide highly tailored advice for this specific individual with the following detailed financial situation:

    MONTHLY FINANCES:
    Monthly income: $${totalMonthlyIncome.toFixed(2)}
    Monthly expenses: $${monthlyExpenses.toFixed(2)}
    Monthly savings: $${(totalMonthlyIncome - monthlyExpenses).toFixed(2)}
    Savings rate: ${savingsRate}%
    
    TOP SPENDING CATEGORIES:
    ${topCategories.map(([category, amount]) => 
      `- ${category}: $${amount.toFixed(2)} (${(amount/monthlyExpenses*100).toFixed(1)}% of expenses)`).join('\n')}
    
    FINANCIAL GOALS:
    ${formattedGoals.map(g => 
      `- ${g.name} (Priority: ${g.priority}): $${g.currentAmount.toFixed(2)}/$${g.targetAmount.toFixed(2)} (${g.progress})
       Remaining: $${g.remaining}, Est. months to completion: ${g.estimatedMonthsToCompletion}`).join('\n')}
    
    Based on this specific financial profile, provide highly personalized advice focused on:
    
    1. Realistic goal achievement timelines based on their actual savings rate
    2. Specific spending categories where they can optimize to accelerate goal progress
    3. Prioritization strategy for their specific goals based on importance and feasibility
    4. Concrete monthly savings targets tied to specific goals
    5. Customized strategies that account for their specific spending patterns
    
    Format your response as a JSON object with these fields:
    {
      "advice": [
        {
          "title": "Concise, personalized advice title with specific numbers",
          "description": "Detailed explanation incorporating their specific financial data",
          "goalName": "The specific goal this advice pertains to (or 'Overall Strategy' if general)",
          "timeframe": "Realistic estimated completion timeframe based on their data",
          "actionText": "One specific, measurable action with a concrete number or percentage"
        }
      ]
    }
    
    IMPORTANT:
    - Use their actual financial numbers in your advice
    - Make specific recommendations tied to their top spending categories
    - Calculate realistic timeframes based on their current savings rate
    - Negative transaction amounts represent normal expenses, not problems
    - Provide advice that is unique to their situation, not generic financial wisdom
    - Only return valid JSON with no additional text or explanation
    `;

    // Call the AI model
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: FINANCIAL_MODEL,
      temperature: 0.3,
      max_tokens: 1500,
      top_p: 0.8,
    });

    // Parse the AI response
    const content = response.choices[0]?.message?.content || '';
    try {
      // Extract JSON from the response (in case it has markdown formatting)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        [null, content];
      const jsonContent = jsonMatch[1] || content;
      const advice = JSON.parse(jsonContent);
      return advice.advice || [];
    } catch (error) {
      console.error('Failed to parse AI advice:', error);
      console.error('AI response was:', content);
      return [];
    }
  } catch (error) {
    console.error('Error generating personalized advice:', error);
    return [];
  }
}

/**
 * Generate a response to a custom financial question
 */
export async function answerCustomFinancialQuestion(
  question: string,
  transactions: Transaction[],
  salaryRecords: SalaryRecord[],
  goals: Goal[],
  savingsRecords: SavingsRecord[]
) {
  try {
    // Check rate limit for custom questions
    if (!rateLimiter.canProceed('CUSTOM_QUESTIONS', RATE_LIMITS.CUSTOM_QUESTIONS)) {
      console.warn('Rate limit exceeded for custom financial questions');
      throw new Error('AI rate limit exceeded for custom questions. Please try again in an hour when the rate limit resets.');
    }
    // Prepare financial context
    const financialSummary = {
      income: salaryRecords.reduce((sum, s) => sum + s.amount, 0),
      spending: transactions.reduce((sum, t) => sum + t.amount, 0),
      savings: savingsRecords.reduce((sum, s) => sum + s.amount, 0),
      goals: goals.map(g => ({
        name: g.name,
        target: g.targetAmount,
        current: g.currentAmount,
        percentage: (g.currentAmount / g.targetAmount * 100).toFixed(1)
      }))
    };
    
    // Create the prompt with the question and financial context
    const prompt = `
    As a financial advisor, answer the following question based on the provided financial data:
    
    QUESTION: ${question}
    
    FINANCIAL CONTEXT:
    Total Income: $${financialSummary.income.toFixed(2)}
    Total Spending: $${financialSummary.spending.toFixed(2)}
    Total Savings: $${financialSummary.savings.toFixed(2)}
    
    Goals:
    ${financialSummary.goals.map(g => `- ${g.name}: $${g.current.toFixed(2)}/$${g.target.toFixed(2)} (${g.percentage}%)`).join('\n')}
    
    Provide a concise, accurate, and helpful answer that directly addresses the question using the financial data provided.
    Include specific data points and actionable advice when relevant.
    
    Format your response as a JSON object:
    {
      "answer": "Your detailed answer here",
      "actionItems": ["Specific action 1", "Specific action 2"]
    }
    
    Only return valid JSON with no additional text or explanation.
    `;

    // Call the AI model
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: FINANCIAL_MODEL,
      temperature: 0.3,
      max_tokens: 1500,
      top_p: 0.8,
    });

    // Parse the AI response
    const content = response.choices[0]?.message?.content || '';
    try {
      // Extract JSON from the response (in case it has markdown formatting)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        [null, content];
      const jsonContent = jsonMatch[1] || content;
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Failed to parse AI answer:', error);
      console.error('AI response was:', content);
      return { 
        answer: "Sorry, I wasn't able to analyze your financial data properly. Please try asking a more specific question.",
        actionItems: ["Try asking a different question"]
      };
    }
  } catch (error) {
    console.error('Error answering custom question:', error);
    return { 
      answer: "I encountered an error while processing your question. Please try again later.",
      actionItems: []
    };
  }
}