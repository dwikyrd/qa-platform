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
import { safeArray } from "../utils/safeArray";

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

  // ✅ SEMUA state default harus array/object yang aman
  const [stats, setStats] = useState({ tickets: {} });
  const [projectTickets, setProjectTickets] = useState([]);
  const [periodStats, setPeriodStats] = useState({ monthly: [], weekly: [] });
  const [testerStats, setTesterStats] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableMonths();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchPeriodStats();
    }
  }, [selectedMonth]);

  const fetchAvailableMonths = async () => {
    try {
      const res = await dashboardAPI.getAvailableMonths();
      const months = safeArray(res.data);
      setAvailableMonths(months);
      // Set default ke bulan terbaru
      if (months.length > 0) {
        setSelectedMonth(months[0].value);
      }
    } catch (error) {
      console.error("Failed to load available months:", error);
      setAvailableMonths([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const statsRes = await dashboardAPI.getGlobalStats();
      setStats(statsRes.data || { tickets: {} });

      const ticketsRes = await dashboardAPI.getProjectTicketCounts();
      setProjectTickets(safeArray(ticketsRes.data));

      const testerRes = await dashboardAPI.getTicketsByTester();
      setTesterStats(safeArray(testerRes.data));
    } catch (error) {
      console.error("Failed to load analytics:", error);
      // ✅ Set default values saat error
      setStats({ tickets: {} });
      setProjectTickets([]);
      setTesterStats([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodStats = async () => {
    if (!selectedMonth) return;

    try {
      const parts = selectedMonth.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);

      const res = await dashboardAPI.getTicketStatsByPeriod(year, month);
      const data = res.data || {};

      setPeriodStats({
        monthly: safeArray(data.monthly),
        weekly: safeArray(data.weekly),
        total_filtered: data.total_filtered || 0,
      });
    } catch (error) {
      console.error("Failed to load period stats:", error);
      setPeriodStats({ monthly: [], weekly: [], total_filtered: 0 });
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

  // ✅ Pastikan tickets selalu object
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

  // ✅ Safe data untuk chart
  const safePieData = safeArray(pieData);
  const safeProjectTickets = safeArray(projectTickets);
  const safeMonthlyData = safeArray(periodStats?.monthly);
  const safeWeeklyData = safeArray(periodStats?.weekly);
  const safeTesterStats = safeArray(testerStats);
  const safeAvailableMonths = safeArray(availableMonths);

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
            🎫 Ticket Status Distribution
          </h3>
          {safePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={safePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {safePieData.map((entry, index) => (
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
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              Belum ada data
            </div>
          )}
        </div>

        {/* Bar Chart - Project */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            📈 Number of Tickets per Project
          </h3>
          {safeProjectTickets.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={safeProjectTickets}>
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
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              Belum ada data project
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Monthly & Weekly Charts dengan Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Monthly Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            📅 Tickets / Month (Last 6 Months)
          </h3>
          {safeMonthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={safeMonthlyData}>
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
              Tickets / Weeks
            </h3>

            {/* Filter Bulan */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {safeAvailableMonths.map((m) => (
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
                  Totals this Months:{" "}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {periodStats.total_filtered || 0}
                </span>
              </div>
            </div>
          )}

          {safeWeeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={safeWeeklyData}>
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
      {safeTesterStats.length > 0 && (
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
                {safeTesterStats.map((stat, idx) => {
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
                            {(stat.tester || "?").charAt(0).toUpperCase()}
                          </div>
                          <span>{stat.tester}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {stat.total || 0}
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
