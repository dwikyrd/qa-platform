import { useState, useEffect } from "react";
import GlobalAnalytics from "../components/GlobalAnalytics";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FolderOpen,
  Plus,
  Archive,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { projectAPI, authAPI, dashboardAPI } from "../services/api";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [user, setUser] = useState(null);

  // Fitur baru: Filter by tester
  const [users, setUsers] = useState([]);
  const [testerFilter, setTesterFilter] = useState("");

  useEffect(() => {
    loadUser();
    loadUsers();
    loadProjects();
  }, []);

  const loadUser = () => {
    const currentUser = authAPI.getCurrentUser();
    setUser(currentUser);
  };

  const loadUsers = async () => {
    try {
      const res = await dashboardAPI.getUsersList();
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getAll();
      setProjects(response.data.active || []);
      setArchivedProjects(response.data.archived || []);
    } catch (error) {
      toast.error("Gagal load projects");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Nama project wajib diisi");
      return;
    }
    try {
      await projectAPI.create(newProjectName.trim());
      toast.success("Project berhasil ditambahkan");
      setNewProjectName("");
      setShowAddModal(false);
      loadProjects();
    } catch (error) {
      toast.error(
        "Gagal menambah project: " + (error.response?.data?.error || ""),
      );
    }
  };

  const handleArchiveProject = async (pid, name) => {
    if (!confirm(`Pindahkan "${name}" ke Archive?`)) return;
    try {
      await projectAPI.archive(pid);
      toast.success("Project diarsipkan");
      loadProjects();
    } catch (error) {
      toast.error("Gagal archive project");
    }
  };

  const handleRestoreProject = async (pid) => {
    try {
      await projectAPI.restore(pid);
      toast.success("Project dikembalikan");
      loadProjects();
    } catch (error) {
      toast.error("Gagal restore project");
    }
  };

  const handleDeleteProject = async (pid, name) => {
    const confirmName = prompt(`Ketik nama project untuk konfirmasi: ${name}`);
    if (confirmName !== name) {
      toast.error("Nama tidak sesuai");
      return;
    }
    try {
      await projectAPI.deletePermanent(pid, name);
      toast.success("Project dihapus permanen");
      loadProjects();
    } catch (error) {
      toast.error(
        "Gagal hapus project: " + (error.response?.data?.error || ""),
      );
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem("user");
      toast.success("Logout berhasil");
      navigate("/login");
    } catch (error) {
      toast.error("Logout gagal");
    }
  };

  // Filter projects by tester (jika ada tester filter)
  const filteredProjects = testerFilter
    ? projects.filter((p) => {
        // Cek apakah ada scenario di project ini yang di-handle oleh tester
        // Ini perlu API call tambahan, untuk sekarang kita tampilkan semua
        return true;
      })
    : projects;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              📂 Project Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Kelola project testing Anda di sini
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Tambah Project
          </button>
        </div>

        {/* Global Analytics */}
        <div className="mb-8">
          <GlobalAnalytics />
        </div>

        {/* Filter Tester (FITUR BARU) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Tester:
            </label>
            <select
              value={testerFilter}
              onChange={(e) => setTesterFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="">Semua Tester</option>
              {users.map((u) => (
                <option key={u.id} value={u.full_name || u.username}>
                  {u.full_name || u.username} ({u.role})
                </option>
              ))}
            </select>
            {testerFilter && (
              <button
                onClick={() => setTesterFilter("")}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Tabs & Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-6 transition-colors">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("active")}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                <FolderOpen className="w-4 h-4 inline mr-2" />
                Active Projects ({projects.length})
              </button>
              <button
                onClick={() => setActiveTab("archived")}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "archived"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                <Archive className="w-4 h-4 inline mr-2" />
                Archived ({archivedProjects.length})
              </button>
            </nav>
          </div>

          {/* Projects Grid */}
          <div className="p-6">
            {activeTab === "active" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg group-hover:bg-blue-500 transition-colors">
                        <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveProject(project.id, project.name);
                        }}
                        className="text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                        title="Archive Project"
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                      {project.name}
                    </h3>
                    {project.link && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {project.link}
                      </p>
                    )}
                  </div>
                ))}

                {filteredProjects.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      Belum ada project aktif
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                      Klik "Tambah Project" untuk memulai
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "archived" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-gray-100 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-6 opacity-75"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-gray-200 dark:bg-gray-600 p-3 rounded-lg">
                        <Archive className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestoreProject(project.id)}
                          className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Restore Project"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteProject(project.id, project.name)
                          }
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete Permanently"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2 line-through">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Archived
                    </p>
                  </div>
                ))}

                {archivedProjects.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Archive className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      Folder Archive Kosong
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              ➕ Tambah Project
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama Project
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Contoh: Project Alpha"
                autoFocus
                onKeyPress={(e) => e.key === "Enter" && handleAddProject()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewProjectName("");
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddProject}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
              >
                💾 Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
