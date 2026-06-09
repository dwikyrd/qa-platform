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
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { dashboardAPI } from "../services/api";
import { Calendar, TrendingUp } from "lucide-react";

const COLORS = {
  done: "#10b981",
  in_progress: "#f59e0b",
  not_run: "#6b7280",
  fail: "#ef4444",
  primary: "#3b82f6",
  purple: "#8b5cf6",
};

export default function GlobalAnalytics() {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [projectTickets, setProjectTickets] = useState([]);
  const [periodStats, setPeriodStats] = useState(null);
  const [testerStats, setTesterStats] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(""); // format: "2026-06"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableMonths();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    // Fetch period stats saat selectedMonth berubah
    fetchPeriodStats();
  }, [selectedMonth]);

  const fetchAvailableMonths = async () => {
    try {
      const res = await dashboardAPI.getAvailableMonths();
      setAvailableMonths(res.data);
      // Set default ke bulan terbaru
      if (res.data.length > 0) {
        setSelectedMonth(res.data[0].value);
      }
    } catch (error) {
      console.error("Failed to load available months:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const statsRes = await dashboardAPI.getGlobalStats();
      setStats(statsRes.data);

      const ticketsRes = await dashboardAPI.getProjectTicketCounts();
      setProjectTickets(ticketsRes.data);

      const testerRes = await dashboardAPI.getTicketsByTester();
      setTesterStats(testerRes.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodStats = async () => {
    if (!selectedMonth) return;

    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const res = await dashboardAPI.getTicketStatsByPeriod(year, month);
      setPeriodStats(res.data);
    } catch (error) {
      console.error("Failed to load period stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-80 animate-pulse"></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-80 animate-pulse"></div>
      </div>
    );
  }

  const tickets = stats?.tickets || {};

  const pieData = [
    { name: "Done", value: tickets.done || 0 },
    { name: "In Progress", value: tickets.in_progress || 0 },
    { name: "Not Run", value: tickets.not_run || 0 },
    { name: "Fail", value: tickets.fail || 0 },
  ];

  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
    border: "none",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    color: theme === "dark" ? "#fff" : "#000",
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        📊 Global Test Analytics
      </h2>

      {/* Row 1: Pie & Bar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            🎫 Distribusi Status Ticket
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
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name.toLowerCase().replace(" ", "_")]}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Project */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            📈 Jumlah Ticket per Project
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectTickets}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
              />
              <XAxis
                dataKey="name"
                stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
                style={{ fontSize: "11px" }}
              />
              <YAxis stroke={theme === "dark" ? "#9ca3af" : "#6b7280"} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="ticket_count"
                fill={COLORS.primary}
                name="Ticket"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Monthly & Weekly Charts dengan Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Monthly Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            📅 Ticket per Bulan (6 Bulan Terakhir)
          </h3>
          {periodStats?.monthly && periodStats.monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={periodStats.monthly}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                />
                <XAxis
                  dataKey="month"
                  stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
                  style={{ fontSize: "11px" }}
                />
                <YAxis
                  stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="count"
                  fill={COLORS.primary}
                  name="Tickets"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              Belum ada data ticket
            </div>
          )}
        </div>

        {/* Weekly Stats dengan Filter Bulan */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Ticket per Minggu
            </h3>

            {/* Filter Bulan */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info total */}
          {periodStats && (
            <div className="mb-3 flex gap-4 text-sm">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">
                  Total Bulan Ini:{" "}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {periodStats.total_filtered || 0}
                </span>
              </div>
            </div>
          )}

          {periodStats?.weekly && periodStats.weekly.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={periodStats.weekly}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                />
                <XAxis
                  dataKey="week"
                  stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
                />
                <YAxis
                  stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.purple}
                  strokeWidth={3}
                  name="Tickets"
                  dot={{ fill: COLORS.purple, r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              Belum ada data ticket
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Tester Stats Table */}
      {testerStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            👥 Ticket per Tester
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tester
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Total
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Done
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    In Progress
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Not Run
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Fail
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {testerStats.map((stat, idx) => {
                  const progress =
                    stat.total > 0
                      ? Math.round(((stat.done || 0) / stat.total) * 100)
                      : 0;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {stat.tester.charAt(0).toUpperCase()}
                          </div>
                          <span>{stat.tester}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {stat.total}
                      </td>
                      <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-medium">
                        {stat.done || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-yellow-600 dark:text-yellow-400 font-medium">
                        {stat.in_progress || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400 font-medium">
                        {stat.not_run || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-red-600 dark:text-red-400 font-medium">
                        {stat.fail || 0}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 text-right">
                            {progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
