import ApiStatistics from "./apistatistics.model.js";

/**
 * Create a new API statistics document for a specific date.
 * 
 * @param {Date|string} [date] - The date for the statistics record (defaults to today at UTC midnight)
 * @param {Object} [initialData={}] - Initial statistics data
 * @returns {Promise<Object>} The created ApiStatistics document
 * @example
 * // Create a document for today with initial data
 * await createApiStatistics(new Date(), { totalRequests: 0 });
 */
export const createApiStatistics = async (date, initialData = {}) => {
  const targetDate = date 
    ? (typeof date === 'string' ? new Date(date) : date)
    : new Date();
  
  targetDate.setUTCHours(0, 0, 0, 0);

  const apiStats = new ApiStatistics({
    date: targetDate,
    ...initialData
  });

  return await apiStats.save();
};


/**
 * Update API statistics with new request data.
 * Uses atomic operations to increment counters and update metrics.
 * 
 * @param {Object} data - Request information to record
 * @param {string} data.path - The request route path
 * @param {string} data.method - The HTTP method
 * @param {number} data.statusCode - The response status code
 * @param {number} data.latency - The request latency in milliseconds
 * @returns {Promise<Object>} The updated ApiStatistics document
 */
export const updateApiStatistics = async data => {
  const { path, method, statusCode, latency } = data;
  
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  // Determine status code category
  let statusCategory = {};
  if (statusCode >= 200 && statusCode < 300) {
    statusCategory = { 'routes.$.statusCodes.success': 1 };
  } else if (statusCode >= 400 && statusCode < 500) {
    statusCategory = { 'routes.$.statusCodes.clientError': 1 };
  } else if (statusCode >= 500) {
    statusCategory = { 'routes.$.statusCodes.serverError': 1 };
  }

  try {
    // Try to update existing route
    const result = await ApiStatistics.findOneAndUpdate(
      { 
        date: today,
        'routes.path': path,
        'routes.method': method
      },
      {
        $inc: { 
          totalRequests: 1,
          'routes.$.count': 1,
          ...(statusCode >= 400 && { 'errors.total': 1 }),
          ...statusCategory
        },
        $min: { 'routes.$.minLatency': latency },
        $max: { 'routes.$.maxLatency': latency }
      },
      { 
        new: true
      }
    );

    // If route doesn't exist yet, add it
    if (!result) {
      const newRoute = {
        path,
        method,
        count: 1,
        avgLatency: latency,
        minLatency: latency,
        maxLatency: latency,
        statusCodes: {
          success: statusCode >= 200 && statusCode < 300 ? 1 : 0,
          clientError: statusCode >= 400 && statusCode < 500 ? 1 : 0,
          serverError: statusCode >= 500 ? 1 : 0
        }
      };

      return await ApiStatistics.findOneAndUpdate(
        { date: today },
        {
          $inc: { 
            totalRequests: 1,
            ...(statusCode >= 400 && { 'errors.total': 1 })
          },
          $push: { routes: newRoute }
        },
        { 
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
    }

    // Update average latency for the route
    if (result) {
      const routeIndex = result.routes.findIndex(r => r.path === path && r.method === method);
      if (routeIndex !== -1) {
        const route = result.routes[routeIndex];
        const newAvg = ((route.avgLatency * (route.count - 1)) + latency) / route.count;
        result.routes[routeIndex].avgLatency = newAvg;
        await result.save();
      }
    }

    return result;
  } catch (err) {
    throw err;
  }
};


/**
 * Fetch API statistics data with range support and aggregations.
 * 
 * @param {Object} options - Query options
 * @param {number} [options.days] - Number of days to look back from today
 * @param {string} [options.startDate] - Start date (format: YYYY-MM-DD or DD.MM.YYYY)
 * @param {string} [options.endDate] - End date (format: YYYY-MM-DD or DD.MM.YYYY)
 * @param {boolean} [options.includeSummary=false] - Whether to include aggregated summary
 * @returns {Promise<Object>} Object containing dailyData and optional summary
 * @example
 * // Get last 7 days with summary
 * const stats = await getApiStatistics({ days: 7, includeSummary: true });
 */
export const getApiStatistics = async (options = {}) => {
  const { days, startDate, endDate, includeSummary = false } = options;
  
  let start = new Date();
  let end = new Date();
  end.setUTCHours(23, 59, 59, 999);

  // Parse date range
  if (startDate) {
    start = new Date(startDate.split('.').reverse().join('-')); 
    start.setUTCHours(0, 0, 0, 0);
  }
  
  if (endDate) {
    end = new Date(endDate.split('.').reverse().join('-'));
    end.setUTCHours(23, 59, 59, 999);
  }
  
  if (days && !startDate) {
    start.setDate(start.getDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
  }

  // Fetch daily data
  const dailyData = await ApiStatistics.find({
    date: { $gte: start, $lte: end }
  })
  .sort({ date: 1 })
  .lean();

  const response = {
    dailyData: dailyData.map(doc => ({
      ...doc,
      successRate: doc.totalRequests > 0 
        ? ((doc.totalRequests - (doc.errors?.total || 0)) / doc.totalRequests * 100).toFixed(2)
        : 0
    }))
  };

  // Calculate summary if requested
  if (includeSummary && dailyData.length > 0) {
    const summary = {
      totalRequests: dailyData.reduce((sum, day) => sum + (day.totalRequests || 0), 0),
      totalErrors: dailyData.reduce((sum, day) => sum + (day.errors?.total || 0), 0),
      avgResponseTime: (dailyData.reduce((sum, day) => sum + (day.performance?.avgResponseTime || 0), 0) / dailyData.length).toFixed(2),
      topRoutes: []
    };

    // Aggregate route statistics
    const routeMap = new Map();
    dailyData.forEach(day => {
      if (day.routes) {
        day.routes.forEach(route => {
          const key = `${route.method} ${route.path}`;
          if (routeMap.has(key)) {
            const existing = routeMap.get(key);
            existing.count += route.count || 0;
            existing.avgLatency = ((existing.avgLatency * existing.requests + (route.avgLatency || 0) * route.count) / (existing.requests + route.count));
            existing.requests += route.count;
          } else {
            routeMap.set(key, {
              path: route.path,
              method: route.method,
              count: route.count || 0,
              avgLatency: route.avgLatency || 0,
              requests: route.count || 0
            });
          }
        });
      }
    });

    // Get top 10 routes by request count
    summary.topRoutes = Array.from(routeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ requests, ...rest }) => rest); // Remove temporary requests field

    summary.errorRate = summary.totalRequests > 0 
      ? ((summary.totalErrors / summary.totalRequests) * 100).toFixed(2)
      : 0;

    response.summary = summary;
  }

  return response;
};
