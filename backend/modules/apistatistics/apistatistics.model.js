import mongoose from "mongoose";

/**
 * Schema for tracking daily API statistics.
 * Stores metrics about requests, routes, and performance on a per-day basis.
 */
const apiStatisticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true // Optimized for range queries
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  routes: [{
    path: {
      type: String,
      required: true
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
    },
    count: {
      type: Number,
      default: 0
    },
    avgLatency: {
      type: Number,
      default: 0 // in milliseconds
    },
    minLatency: {
      type: Number,
      default: 0
    },
    maxLatency: {
      type: Number,
      default: 0
    },
    statusCodes: {
      success: { type: Number, default: 0 }, // 2xx
      clientError: { type: Number, default: 0 }, // 4xx
      serverError: { type: Number, default: 0 } // 5xx
    }
  }],
  performance: {
    avgResponseTime: {
      type: Number,
      default: 0 // Average across all requests in ms
    },
    p50: {
      type: Number,
      default: 0 // 50th percentile (median)
    },
    p95: {
      type: Number,
      default: 0 // 95th percentile
    },
    p99: {
      type: Number,
      default: 0 // 99th percentile
    }
  },
  errors: {
    total: {
      type: Number,
      default: 0
    },
    rate: {
      type: Number,
      default: 0 // Error rate as percentage
    }
  }
},
{ 
  timestamps: true,
  suppressReservedKeysWarning: true,
  toJSON: { 
    virtuals: true 
  },
  toObject: { 
    virtuals: true
  }
});

/**
 * Virtual field for success rate.
 * Calculates the percentage of successful requests (non-error).
 */
apiStatisticsSchema.virtual('successRate').get(function() {
  if (this.totalRequests === 0) return 0;
  return ((this.totalRequests - this.errors.total) / this.totalRequests * 100).toFixed(2);
});

/**
 * Find the most frequently called route.
 */
apiStatisticsSchema.virtual('topRoute').get(function() {
  if (!this.routes || this.routes.length === 0) return null;
  
  return this.routes.reduce((max, route) => 
    route.count > (max?.count || 0) ? route : max, 
    null
  );
});

export default mongoose.model("ApiStatistics", apiStatisticsSchema);
