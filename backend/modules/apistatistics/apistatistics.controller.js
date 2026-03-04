import { 
  StatusCodes
} from 'http-status-codes';

// owm modules
import { 
    app 
} from '../../config/index.js';
import {
    getApiStatistics
} from './apistatistics.services.js';

/**
 * Get API statistics with optional date range filtering.
 * 
 * @param {import("fastify").FastifyRequest} req - Fastify request object
 * @param {import("fastify").FastifyReply} reply - Fastify reply object
 * @returns {Promise<void>}
 */
export const getApiStatisticsController = async (req, reply) => {

  const { days, startDate, endDate, includeSummary } = req.query;

  const query = {
    days: days ? parseInt(days) : undefined,
    startDate,
    endDate,
    includeSummary: includeSummary === 'true'
  };

  const data = await getApiStatistics(query);

  if (!data)
    app.log.warn("Could not fetch any API statistics");

  return reply.code(StatusCodes.OK).send({
    message: `API statistics successfully found`,
    success: true,
    statusCode: StatusCodes.OK,
    data: data,
  });
};
