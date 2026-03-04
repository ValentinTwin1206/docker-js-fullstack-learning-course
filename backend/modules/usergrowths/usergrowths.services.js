import UserGrowth from "./usergrowths.model.js";

/**
 * Create a new user growth document for a specific date.
 * 
 * @param {Date|string} [date] - The date for the growth record (defaults to today at UTC midnight)
 * @param {number} [registrations=0] - Initial registration count
 * @param {number} [deletions=0] - Initial deletion count
 * @returns {Promise<Object>} The created UserGrowth document
 * @example
 * // Create a document for a specific date
 * await createUsersGrowth(new Date('2026-01-01'), 10, 2);
 */
export const createUsersGrowth = async (date, registrations = 0, deletions = 0) => {
  const targetDate = date 
    ? (typeof date === 'string' ? new Date(date) : date)
    : new Date();
  
  targetDate.setUTCHours(0, 0, 0, 0);

  const userGrowth = new UserGrowth({
    date: targetDate,
    registrations,
    deletions
  });

  return await userGrowth.save();
};


/**
 * Fetch user growth data with range support and totals.
 * 
 * @param {Object} query - Query options
 */
export const getUsersGrowth = async (query = {}) => {
  const { days, startDate, endDate, includeSummary = false } = query;
  
  let start = new Date();
  let end = new Date();
  end.setUTCHours(23, 59, 59, 999);

  // 1. Logic for Date Range Parsing
  if (startDate) {
    // Handles formats like "01.01.2026" or "2026-01-01"
    start = new Date(startDate.split('.').reverse().join('-')); 
    if (endDate) end = new Date(endDate.split('.').reverse().join('-'));
  } else {
    // Default or relative days
    const lookback = days || 30;
    start.setDate(start.getDate() - lookback);
  }
  
  start.setUTCHours(0, 0, 0, 0);

  // 2. Database Fetch
  const documents = await UserGrowth.find({
    date: { $gte: start, $lte: end }
  }).sort({ date: 1 });

  // Convert to plain objects with virtuals included
  const results = documents.map(doc => doc.toObject());

  // 3. Optional Summary Aggregation
  if (includeSummary) {
    const summary = results.reduce((acc, curr) => {
      acc.totalRegistrations += curr.registrations;
      acc.totalDeletions += curr.deletions;
      acc.netGrowth += curr.netGrowth; // Use the virtual field
      return acc;
    }, { totalRegistrations: 0, totalDeletions: 0, netGrowth: 0 });

    return { summary, dailyData: results };
  }

  return results;
};


/**
 * Record a user lifecycle event (signup or deletion).
 * Uses high-performance atomic increments.
 * @param {'registration' | 'deletion'} eventType 
 */
export const updateUsersGrowth = async eventType => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const incrementField = eventType === 'registration' 
    ? 'registrations'
    : 'deletions';

  return await UserGrowth.findOneAndUpdate(
    { 
      date: today
    },
    {
      $inc: { 
        [incrementField]: 1
      }
    },
    { 
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};
