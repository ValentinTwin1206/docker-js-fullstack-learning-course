/**
 * Top 10 most-called API routes table — replaces the topRoutesTable from statistics.hbs.
 */

const METHOD_BADGE = {
  GET: 'badge bg-primary',
  POST: 'badge bg-success',
  PUT: 'badge bg-warning',
  PATCH: 'badge bg-info',
  DELETE: 'badge bg-danger',
};

export default function TopRoutesTable({ routes = [] }) {
  return (
    <div className="table-responsive">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Method</th>
            <th>Path</th>
            <th>Total Requests</th>
            <th>Avg Latency</th>
          </tr>
        </thead>
        <tbody>
          {routes.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center text-muted">
                No data available
              </td>
            </tr>
          ) : (
            routes.map((route, idx) => (
              <tr key={`${route.method}-${route.path}`}>
                <td>{idx + 1}</td>
                <td>
                  <span className={METHOD_BADGE[route.method] || 'badge bg-secondary'}>
                    {route.method}
                  </span>
                </td>
                <td>
                  <code>{route.path}</code>
                </td>
                <td>{route.count?.toLocaleString() || 0}</td>
                <td>{route.avgLatency?.toFixed(2) || 0}ms</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
