import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { safeArray } from "../utils/safeArray";
import {
  ArrowLeft,
  Users,
  Activity,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  UserPlus,
  CheckCircle,
  XCircle,
  Shield,
  User,
  Eye,
} from "lucide-react";
import { adminAPI, authAPI } from "../services/api";
import Navbar from "../components/Navbar";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // User Modal States
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    role: "tester",
    is_active: true,
  });

  // Log States
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logAction, setLogAction] = useState("");
  const [logUser, setLogUser] = useState(""); // ✅ Filter User ID

  const user = authAPI.getCurrentUser();

  // Redirect jika bukan admin
  useEffect(() => {
    if (user?.role !== "admin") {
      toast.error(
        "Akses ditolak: Hanya admin yang dapat mengakses halaman ini",
      );
      navigate("/");
    }
  }, [user, navigate]);

  // Load data saat tab, page, atau filter berubah
  useEffect(() => {
    loadData();
  }, [activeTab, logPage, logAction, logUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "users") {
        const res = await adminAPI.getUsers();
        setUsers(res.data);
      } else {
        const params = { page: logPage, limit: 30 };
        if (logAction) params.action = logAction;
        if (logUser) params.user_id = logUser; // ✅ Kirim filter user_id ke backend

        const res = await adminAPI.getActivityLogs(params);
        setLogs(res.data.logs);
        setLogTotal(res.data.total);
      }
    } catch (error) {
      toast.error("Gagal memuat data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- USER HANDLERS ---
  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.password) {
      toast.error("Username dan password wajib diisi");
      return;
    }
    try {
      await adminAPI.createUser(userForm);
      toast.success("User berhasil dibuat");
      setShowUserModal(false);
      setUserForm({
        username: "",
        password: "",
        full_name: "",
        email: "",
        role: "tester",
        is_active: true,
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Gagal membuat user");
    }
  };

  const handleUpdateUser = async () => {
    try {
      await adminAPI.updateUser(editingUser.id, editingUser);
      toast.success("User berhasil diupdate");
      setEditingUser(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Gagal update user");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Hapus user "${username}" secara permanen?`)) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success("User dihapus");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Gagal hapus user");
    }
  };

  const openEditModal = (u) => {
    setEditingUser({ ...u, new_password: "" });
  };

  // --- LOG HANDLERS ---
  const getActionColor = (action) => {
    const colors = {
      login:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      logout: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
      create_project:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      create_ticket:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      update_cell:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      upload_screenshot:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      delete_tc: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      change_password:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      create_user:
        "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      update_user:
        "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      delete_user:
        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    };
    return (
      colors[action] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
    );
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      user: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      viewer: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
    };
    return styles[role] || styles.user;
  };

  const handleLogout = async () => {
    await authAPI.logout();
    toast.success("Logout berhasil");
    navigate("/login");
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500">Memverifikasi akses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Kelola user dan monitor aktivitas sistem
            </p>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px px-6">
              <button
                onClick={() => setActiveTab("users")}
                className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 mr-4 ${
                  activeTab === "users"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
                }`}
              >
                <Users className="w-4 h-4" />
                User Management
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "logs"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
                }`}
              >
                <Activity className="w-4 h-4" />
                Activity Logs
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* ================= USER MANAGEMENT TAB ================= */}
                {activeTab === "users" && (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Daftar Users ({users.length})
                      </h2>
                      <button
                        onClick={() => setShowUserModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg flex items-center gap-2 hover:from-blue-700 hover:to-purple-700 shadow-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        Tambah User
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              ID
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Username
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Full Name
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Email
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Role
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Status
                            </th>
                            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {safeArray(users).map((u) => (
                            <tr
                              key={u.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="py-3 px-4 font-mono text-xs text-gray-500">
                                #{u.id}
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {u.username.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{u.username}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                {u.full_name || "-"}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                {u.email || "-"}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(u.role)}`}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {u.is_active ? (
                                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                                    <CheckCircle className="w-4 h-4" /> Active
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium">
                                    <XCircle className="w-4 h-4" /> Inactive
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => openEditModal(u)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteUser(u.id, u.username)
                                    }
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {users.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          Belum ada user terdaftar
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ================= ACTIVITY LOGS TAB ================= */}
                {activeTab === "logs" && (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Activity Logs ({logTotal} total)
                      </h2>

                      <div className="flex flex-wrap gap-2">
                        {/* ✅ Filter User */}
                        <select
                          value={logUser}
                          onChange={(e) => {
                            setLogUser(e.target.value);
                            setLogPage(1);
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">👤 Semua User</option>
                          {safeArray(users).map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username}{" "}
                              {u.full_name ? `(${u.full_name})` : ""}
                            </option>
                          ))}
                        </select>

                        {/* Filter Action */}
                        <select
                          value={logAction}
                          onChange={(e) => {
                            setLogAction(e.target.value);
                            setLogPage(1);
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value=""> Semua Action</option>
                          <option value="login">Login</option>
                          <option value="logout">Logout</option>
                          <option value="create_project">Create Project</option>
                          <option value="create_ticket">Create Ticket</option>
                          <option value="update_cell">Update Cell</option>
                          <option value="upload_screenshot">
                            Upload Screenshot
                          </option>
                          <option value="delete_tc">Delete TC</option>
                          <option value="change_password">
                            Change Password
                          </option>
                          <option value="create_user">Create User</option>
                          <option value="update_user">Update User</option>
                          <option value="delete_user">Delete User</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Waktu
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              User
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Action
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Target
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Details
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                          {safeArray(logs).map((log) => (
                            <tr
                              key={log.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                            >
                              <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                                {log.created_at || "-"}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {log.username?.charAt(0)?.toUpperCase() ||
                                      "?"}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">
                                      {log.username || "Unknown"}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                      {log.full_name || ""}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}
                                >
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                                {log.target_type && log.target_id ? (
                                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {log.target_type} #{log.target_id}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td
                                className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate"
                                title={log.details}
                              >
                                {log.details || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {logs.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          Tidak ada activity logs yang ditemukan
                        </div>
                      )}
                    </div>

                    {/* Pagination */}
                    {logTotal > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Menampilkan {(logPage - 1) * 30 + 1} -{" "}
                          {Math.min(logPage * 30, logTotal)} dari {logTotal}{" "}
                          logs
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setLogPage(Math.max(1, logPage - 1))}
                            disabled={logPage === 1}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                          >
                            Prev
                          </button>
                          <span className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg">
                            Page {logPage}
                          </span>
                          <button
                            onClick={() => setLogPage(logPage + 1)}
                            disabled={logPage * 30 >= logTotal}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= CREATE USER MODAL ================= */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Tambah User Baru
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/\s/g, ""),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="username"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({ ...userForm, password: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimal 6 karakter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) =>
                      setUserForm({ ...userForm, full_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm({ ...userForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Tester</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={userForm.is_active}
                    onChange={(e) =>
                      setUserForm({ ...userForm, is_active: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Active Account
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateUser}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  💾 Simpan User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT USER MODAL ================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Edit User: {editingUser.username}
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                    Username
                  </div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {editingUser.username}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.full_name || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Tester</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={editingUser.is_active}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        is_active: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="edit_is_active"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Active Account
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password{" "}
                    <span className="text-gray-400 font-normal text-xs">
                      (Kosongkan jika tidak ingin mengubah)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editingUser.new_password || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        new_password: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimal 6 karakter"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  💾 Update User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
