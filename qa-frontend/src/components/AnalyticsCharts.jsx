import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { safeArray } from "../utils/safeArray";

const COLORS = {
  pass: "#10b981",
  fail: "#ef4444",
  in_progress: "#f59e0b",
  not_run: "#6b7280",
};

export default function AnalyticsCharts({ sid }) {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [sid]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/summary/${sid}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-80 animate-pulse"></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-80 animate-pulse"></div>
      </div>
    );
  }

  const pieData = [
    { name: "Pass", value: stats.pass || 0 },
    { name: "Fail", value: stats.fail || 0 },
    { name: "In Progress", value: stats.in_progress || 0 },
    { name: "Not Run", value: stats.not_run || 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          📊 Test Case Status Distribution
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {safeArray(pieData).map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name.toLowerCase().replace(" ", "_")]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
              itemStyle={{ color: theme === "dark" ? "#fff" : "#000" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-4 flex-wrap">
          {safeArray(pieData).map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    COLORS[item.name.toLowerCase().replace(" ", "_")],
                }}
              ></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {item.name}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          📈 Summary Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Pass Rate"
            value={`${stats.pass_rate || 0}%`}
            color="success"
            icon="✓"
          />
          <StatCard
            label="Total"
            value={stats.total || 0}
            color="primary"
            icon="📊"
          />
          <StatCard
            label="Pass"
            value={stats.pass || 0}
            color="pass"
            icon="✓"
          />
          <StatCard
            label="Fail"
            value={stats.fail || 0}
            color="fail"
            icon="✗"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  const colors = {
    primary: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
    success:
      "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300",
    pass: "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300",
    fail: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300",
  };

  return (
    <div className={`${colors[color]} rounded-lg p-4 text-center`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}
