import { 
  StatusCodes
} from 'http-status-codes';

// own modules
import { 
  app
} from '../../config/index.js';
import { 
  getUsersGrowth
} from './usergrowths.services.js';

/**
 * Get user growth statistics with optional date range filtering.
 * 
 * @param {import("fastify").FastifyRequest} req - Fastify request object
 * @param {import("fastify").FastifyReply} reply - Fastify reply object
 * @returns {Promise<void>}
 */
export const getUserGrowthController = async (req, reply) => {
  const { days, startDate, endDate, includeSummary } = req.query;

  const options = {
    days: days ? parseInt(days) : undefined,
    startDate,
    endDate,
    includeSummary: includeSummary === 'true'
  };

  const data = await getUsersGrowth(options);

  if (!data)
    app.log.warn("Could not fetch any user-growth statistics");

  return reply.code(StatusCodes.OK).send({
    message: `User growth data successfully found`,
    success: true,
    statusCode: StatusCodes.OK,
    data: data,
  });
};
