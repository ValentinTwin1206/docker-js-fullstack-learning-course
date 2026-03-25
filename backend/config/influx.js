import { InfluxDB, Point } from '@influxdata/influxdb-client';

// constants
const INFLUX_URL    = process.env.INFLUXDB_URL;
const INFLUX_TOKEN  = process.env.INFLUXDB_TOKEN;
const INFLUX_ORG    = process.env.INFLUXDB_ORG;
const INFLUX_BUCKET = process.env.INFLUXDB_BUCKET;

let writeApi = null;

/**
 * Initialise the InfluxDB WriteApi and attach it to the Fastify instance.
 * Also decorates the app with a `influx.writePoint()` helper.
 *
 * @param {import('fastify').FastifyInstance} app
 */
export async function setupInflux(app) {
  app.log.info(`Initializing InfluxDB connection to '${INFLUX_URL}'`);

  const client = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });

  // batchSize 1 = flush every point immediately (good for dev/low-traffic)
  // increase batchSize + flushInterval for production
  writeApi = client.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ms', {
    batchSize: 10,
    flushInterval: 5_000,
    writeFailed(error, lines, attempt, expires) {
      app.log.error(
        { attempt, expires, lines },
        `InfluxDB write failed: ${error.message}`
      );
    },
    writeSuccess(lines) {
      app.log.debug(
        { lines },
        `InfluxDB flushed ${lines.length} point(s) successfully`
      );
    },
  });

  // Expose a simple write helper on app.influx
  app.decorate('influx', {
    /**
     * Write an API-request data point.
     * @param {{ method: string, path: string, statusCode: number, latency: number }} data
     */
    writeApiRequest(data) {
      const point = new Point('api_requests')
        .tag('method', data.method)
        .tag('path', data.path)
        .tag('status_code', String(data.statusCode))
        .intField('count', 1)
        .floatField('latency_ms', data.latency);

      writeApi.writePoint(point);
      app.log.debug(
        `[InfluxDB] queued api_requests: ${data.method} ${data.path} ${data.statusCode} (${data.latency}ms)`
      );
    },

    /**
     * Write a user-growth data point.
     * @param {'registration'|'deletion'} event
     */
    writeUserGrowth(event) {
      const point = new Point('user_growth')
        .tag('event', event)
        .intField('count', 1);

      writeApi.writePoint(point);
      app.log.debug(`[InfluxDB] queued user_growth: event=${event}`);
    },
  });

  // Flush + close on Fastify shutdown
  app.addHook('onClose', async () => {
    try {
      app.log.info('Flushing InfluxDB write buffer...');
      await writeApi.close();
      app.log.info('InfluxDB connection closed.');
    } catch (err) {
      app.log.error('Error closing InfluxDB connection');
      app.log.error(err.message);
    }
  });

  app.log.info(`InfluxDB ready – org: '${INFLUX_ORG}', bucket: '${INFLUX_BUCKET}'`);
}
