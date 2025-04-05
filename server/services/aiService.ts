import { Groq } from 'groq-sdk';
import { Transaction, SalaryRecord, Goal, SavingsRecord } from '@shared/schema';
import { decrypt } from '../utils/encryption';

// Initialize Groq client using official SDK
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Models to use
const FINANCIAL_MODEL = 'llama3-70b-8192';  // High-performance model for financial analysis

/**
 * Formats a financial data summary for AI processing
 */
function formatFinancialData(
  transactions: Transaction[],
  salaryRecords: SalaryRecord[],
  goals: Goal[],
  savingsRecords: SavingsRecord[]
) {
  // Decrypt sensitive data where applicable
  const processedTransactions = transactions.map(t => ({
    ...t,
    // Include decrypted data if available
    ...(t.encryptedData ? { decryptedData: JSON.parse(decrypt(t.encryptedData)) } : {})
  }));
  
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
    
    // Format the prompt for the AI
    const prompt = `
    As a financial analyst, review the following financial data and provide 3-5 actionable insights:

    SUMMARY:
    Total spending: $${totalSpending.toFixed(2)}
    Total income: $${totalIncome.toFixed(2)}
    Savings rate: ${totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome * 100).toFixed(1) : 0}%
    
    SPENDING BY CATEGORY:
    ${Object.entries(transactionsByCategory)
      .map(([category, amount]) => `- ${category}: $${amount.toFixed(2)} (${(amount/totalSpending*100).toFixed(1)}%)`)
      .join('\n')}
    
    Based on this information, provide:
    1. Top spending categories and if they align with financial goals
    2. Savings potential and opportunities to reduce spending
    3. Specific, actionable recommendations for improving financial health
    4. Unusual spending patterns or potential issues to address
    
    Format your response as a JSON object with these fields:
    {
      "insights": [
        {
          "title": "Short, actionable title",
          "description": "Detailed insight explanation",
          "type": "spending|saving|goal|warning",
          "actionText": "Specific action the user can take"
        }
      ]
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
    // Calculate current financial situation
    const monthlyIncome = salaryRecords.length > 0 
      ? salaryRecords[salaryRecords.length - 1].amount 
      : 0;
    
    const monthlySpending = transactions
      .filter(t => {
        const date = new Date(t.date);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Format goals for AI input
    const formattedGoals = goals.map(g => ({
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      progress: (g.currentAmount / g.targetAmount * 100).toFixed(1) + '%'
    }));
    
    // Create the prompt
    const prompt = `
    As a financial advisor, provide personalized advice for someone with the following financial situation:

    Monthly income: $${monthlyIncome.toFixed(2)}
    Monthly spending: $${monthlySpending.toFixed(2)}
    
    Financial Goals:
    ${formattedGoals.map(g => `- ${g.name}: $${g.currentAmount.toFixed(2)}/$${g.targetAmount.toFixed(2)} (${g.progress})`).join('\n')}
    
    Based on this information, provide specific, personalized financial advice focused on helping them achieve their goals. Include:
    
    1. Realistic timeframes for achieving each goal based on current saving rate
    2. Suggestions for optimizing spending to accelerate goal achievement
    3. Prioritization advice if multiple goals exist
    
    Format your response as a JSON object with these fields:
    {
      "advice": [
        {
          "title": "Short, specific advice title",
          "description": "Detailed explanation of the advice",
          "goalName": "The name of the relevant goal (or 'General' if not goal-specific)",
          "timeframe": "Estimated timeframe to achieve the goal",
          "actionText": "Specific action the user can take"
        }
      ]
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