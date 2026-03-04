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

/**
 * Formats "2026-03-01" → "Mar 1".
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * User Growth line chart — replaces the growthChart <canvas> from statistics.hbs.
 * Shows cumulative users, daily registrations, and daily deletions.
 */
export default function UserGrowthChart({ dailyData = [] }) {
  if (dailyData.length === 0) {
    return <p className="text-muted">No growth data available.</p>;
  }

  const labels = [];
  const registrations = [];
  const deletions = [];
  const cumulative = [];
  let cumulativeCount = 0;

  dailyData.forEach((day) => {
    labels.push(formatDate(day.date));
    registrations.push(day.registrations || 0);
    deletions.push(day.deletions || 0);
    cumulativeCount += day.netGrowth || 0;
    cumulative.push(cumulativeCount);
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Total Users (Cumulative)',
        data: cumulative,
        borderColor: 'rgb(0, 102, 255)',
        backgroundColor: 'rgba(0, 102, 255, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Daily Registrations',
        data: registrations,
        borderColor: 'rgb(40, 167, 69)',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y1',
      },
      {
        label: 'Daily Deletions',
        data: deletions,
        borderColor: 'rgb(220, 53, 69)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Total Users' },
        beginAtZero: true,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: { display: true, text: 'Daily Changes' },
        beginAtZero: true,
        grid: { drawOnChartArea: false },
      },
    },
  };

  return <Line data={data} options={options} />;
}
