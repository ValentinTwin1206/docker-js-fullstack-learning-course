import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Line chart showing avg and P95 response latency — replaces latencyChart <canvas>.
 */
export default function ResponseTimeChart({ dailyData = [] }) {
  if (dailyData.length === 0) {
    return <p className="text-muted">No latency data available.</p>;
  }

  const labels = dailyData.map((d) => formatDate(d.date));
  const avgLatency = dailyData.map((d) => d.performance?.avg || 0);
  const p95Latency = dailyData.map((d) => d.performance?.p95 || 0);

  const data = {
    labels,
    datasets: [
      {
        label: 'Avg Latency',
        data: avgLatency,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'P95 Latency',
        data: p95Latency,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        borderDash: [5, 5],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'top' } },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Latency (ms)' },
      },
    },
  };

  return <Line data={data} options={options} />;
}
