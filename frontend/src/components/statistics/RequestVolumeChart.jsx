import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Bar chart showing daily request volume — replaces requestsChart <canvas>.
 */
export default function RequestVolumeChart({ dailyData = [] }) {
  if (dailyData.length === 0) {
    return <p className="text-muted">No request data available.</p>;
  }

  const labels = dailyData.map((d) => formatDate(d.date));
  const requests = dailyData.map((d) => d.totalRequests || 0);

  const data = {
    labels,
    datasets: [
      {
        label: 'Total Requests',
        data: requests,
        backgroundColor: 'rgba(0, 102, 255, 0.6)',
        borderColor: 'rgb(0, 102, 255)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Requests' },
      },
    },
  };

  return <Bar data={data} options={options} />;
}
