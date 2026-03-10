import { useState, useEffect } from 'react';
import toast                   from 'react-hot-toast';

import Navbar                              from '../components/Navbar';
import Sidemenu                            from '../components/Sidemenu';
import UserGrowthChart                     from '../components/statistics/UserGrowthChart';
import RequestVolumeChart                  from '../components/statistics/RequestVolumeChart';
import ResponseTimeChart                   from '../components/statistics/ResponseTimeChart';
import TopRoutesTable                      from '../components/statistics/TopRoutesTable';
import { getUserGrowth, getApiStatistics } from '../api/statistics';

/**
 * Statistics dashboard page — replaces statistics.hbs.
 * Shows user-growth summary cards + chart, and API traffic summary + charts + top routes.
 */
export default function StatisticsPage() {
  const [growthData, setGrowthData] = useState({ dailyData: [], summary: null });
  const [changeData, setChangeData] = useState({ change: 0, percentage: '0.0', isPositive: true });
  const [apiStats, setApiStats] = useState({ dailyData: [], summary: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [growthRes, apiRes] = await Promise.all([
          getUserGrowth({ days: 30, includeSummary: true }),
          getApiStatistics({ days: 30, includeSummary: true }),
        ]);

        // ── User growth ──
        const gd = growthRes.data || growthRes;
        setGrowthData(gd);

        // Compute today vs yesterday change
        if (gd.dailyData && gd.dailyData.length >= 2) {
          const today = gd.dailyData[gd.dailyData.length - 1];
          const yesterday = gd.dailyData[gd.dailyData.length - 2];
          const todayNet = today.netGrowth || 0;
          const yesterdayNet = yesterday.netGrowth || 0;
          const diff = todayNet - yesterdayNet;
          const isPositive = diff >= 0;

          let pct;
          if (yesterdayNet !== 0) {
            pct = ((diff / Math.abs(yesterdayNet)) * 100).toFixed(1);
          } else if (diff !== 0) {
            pct = '∞';
          } else {
            pct = '0.0';
          }

          setChangeData({ change: diff, percentage: pct, isPositive });
        }

        // ── API statistics ──
        const ad = apiRes.data || apiRes;
        setApiStats(ad);
      } catch {
        toast.error('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  // ── Derived values ──
  const summary = growthData.summary || {};
  const todayGrowth =
    growthData.dailyData?.length > 0
      ? growthData.dailyData[growthData.dailyData.length - 1]
      : {};

  const apiSummary = apiStats.summary || {};
  const todayApi =
    apiStats.dailyData?.length > 0
      ? apiStats.dailyData[apiStats.dailyData.length - 1]
      : {};

  const totalNetGrowth = summary.netGrowth || 0;
  const successRate =
    apiSummary.errorRate !== undefined
      ? (100 - parseFloat(apiSummary.errorRate)).toFixed(2)
      : '0.00';

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="d-flex">
        <Sidemenu />

        <div className="flex-grow-1 p-4">
          {/* ═══════════ USER GROWTH ═══════════ */}
          <h4 className="mb-4">User Growth Statistics</h4>

          {/* Summary Cards — Total */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card" style={{ backgroundColor: '#d4edda' }}>
                <div className="card-body">
                  <h5 className="card-title">Total Registrations</h5>
                  <h2>{summary.totalRegistrations || 0}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card" style={{ backgroundColor: '#ffeceb' }}>
                <div className="card-body">
                  <h5 className="card-title">Total Deletions</h5>
                  <h2>{summary.totalDeletions || 0}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div
                className="card"
                style={{ backgroundColor: totalNetGrowth >= 0 ? '#e9f2ff' : '#ffeceb' }}
              >
                <div className="card-body">
                  <h5 className="card-title">Net Growth</h5>
                  <h2>{totalNetGrowth}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Today's Registrations</h6>
                  <h3>{todayGrowth.registrations || 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Today's Deletions</h6>
                  <h3>{todayGrowth.deletions || 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Today's Net Growth</h6>
                  <h3>{todayGrowth.netGrowth || 0}</h3>
                  {changeData.change !== 0 ? (
                    <small style={{ color: changeData.isPositive ? 'green' : 'red' }}>
                      {changeData.isPositive ? '+' : ''}
                      {changeData.percentage}% vs yesterday
                    </small>
                  ) : (
                    <small className="text-muted">No change vs yesterday</small>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Growth Chart */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title">User Growth Over Time (Last 30 Days)</h6>
              <div style={{ maxHeight: 400 }}>
                <UserGrowthChart dailyData={growthData.dailyData} />
              </div>
            </div>
          </div>

          {/* ═══════════ API STATISTICS ═══════════ */}
          <h4 className="mb-4 mt-5">API Statistics</h4>

          {/* API Summary Cards — Total */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card" style={{ backgroundColor: '#e9f2ff' }}>
                <div className="card-body">
                  <h5 className="card-title">Total Requests</h5>
                  <h2>{apiSummary.totalRequests?.toLocaleString() || 0}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card" style={{ backgroundColor: '#d4edda' }}>
                <div className="card-body">
                  <h5 className="card-title">Success Rate</h5>
                  <h2>{successRate}%</h2>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card" style={{ backgroundColor: '#fff3cd' }}>
                <div className="card-body">
                  <h5 className="card-title">Avg Response Time</h5>
                  <h2>{apiSummary.avgResponseTime || 0}ms</h2>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card" style={{ backgroundColor: '#ffeceb' }}>
                <div className="card-body">
                  <h5 className="card-title">Total Errors</h5>
                  <h2>{apiSummary.totalErrors?.toLocaleString() || 0}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Today's API Stats */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Today's Requests</h6>
                  <h3>{todayApi.totalRequests?.toLocaleString() || 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Today's Success Rate</h6>
                  <h3>{todayApi.successRate || 0}%</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Today's Avg Latency</h6>
                  <h3>{todayApi.performance?.avg || 0}ms</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Today's Errors</h6>
                  <h3>{(todayApi.errors?.total || 0).toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* API Charts */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">Request Volume Over Time</h6>
                  <div style={{ maxHeight: 300 }}>
                    <RequestVolumeChart dailyData={apiStats.dailyData} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">Response Time Trends</h6>
                  <div style={{ maxHeight: 300 }}>
                    <ResponseTimeChart dailyData={apiStats.dailyData} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Routes Table */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title">Top 10 Most Called Routes</h6>
              <TopRoutesTable routes={apiSummary.topRoutes || []} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
