import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Archive,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Edit3,
  Calendar,
  User,
  FolderArchive,
  Users,
} from "lucide-react";
import {
  scenarioAPI,
  projectAPI,
  authAPI,
  dashboardAPI,
} from "../services/api";
import Navbar from "../components/Navbar";

export default function Project() {
  const { pid } = useParams();
  const navigate = useNavigate();

  // Loading & User
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Project & Scenarios
  const [project, setProject] = useState(null);
  const [allScenarios, setAllScenarios] = useState([]);
  const [filteredScenarios, setFilteredScenarios] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [testerFilter, setTesterFilter] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [portfolioFilter, setPortfolioFilter] = useState("all");

  // Users for tester filter
  const [users, setUsers] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [newScenarioTitle, setNewScenarioTitle] = useState("");
  const [renameTitle, setRenameTitle] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectLink, setEditProjectLink] = useState("");

  // ============ LOAD DATA ============
  useEffect(() => {
    loadUser();
    loadUsers();
  }, []);

  useEffect(() => {
    if (pid) {
      loadProjectData();
    }
  }, [pid, testerFilter]);

  // Apply filters saat searchQuery atau statusFilter berubah
  useEffect(() => {
    applyFilters();
  }, [allScenarios, searchQuery, statusFilter]);

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

  const loadProjectData = async () => {
    try {
      setLoading(true);

      // Load project info
      const projectRes = await projectAPI.getAll();
      const activeProjects = projectRes.data.active || [];
      const archivedProjects = projectRes.data.archived || [];
      const allProjects = [...activeProjects, ...archivedProjects];
      const foundProject = allProjects.find((p) => p.id === parseInt(pid));

      if (!foundProject) {
        toast.error("Project tidak ditemukan");
        navigate("/");
        return;
      }

      setProject(foundProject);
      setEditProjectName(foundProject.name);
      setEditProjectLink(foundProject.link || "");

      // Load scenarios dengan filter tester
      const params = {};
      if (testerFilter) {
        params.tester = testerFilter;
      }

      const scenariosRes = await scenarioAPI.getAll(pid, params);
      const scenarios = scenariosRes.data || [];

      setAllScenarios(scenarios);
    } catch (error) {
      toast.error("Gagal load project data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allScenarios];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    setFilteredScenarios(filtered);
  };

  // ============ HANDLERS ============
  const handleAddScenario = async () => {
    if (!newScenarioTitle.trim()) {
      toast.error("Judul ticket wajib diisi");
      return;
    }

    try {
      await scenarioAPI.create(pid, newScenarioTitle.trim());
      toast.success("Ticket berhasil ditambahkan");
      setNewScenarioTitle("");
      setShowAddModal(false);
      loadProjectData();
    } catch (error) {
      toast.error(
        "Gagal menambah ticket: " + (error.response?.data?.error || ""),
      );
    }
  };

  const handleRenameScenario = async () => {
    if (!renameTitle.trim()) {
      toast.error("Judul tidak boleh kosong");
      return;
    }

    try {
      await scenarioAPI.rename(editingScenario.id, renameTitle.trim());
      toast.success("Ticket berhasil di-rename");
      setShowRenameModal(false);
      setEditingScenario(null);
      setRenameTitle("");
      loadProjectData();
    } catch (error) {
      toast.error("Gagal rename ticket");
    }
  };

  const handleEditProject = async () => {
    if (!editProjectName.trim()) {
      toast.error("Nama project wajib diisi");
      return;
    }

    try {
      await projectAPI.update(
        project.id,
        editProjectName.trim(),
        editProjectLink.trim(),
      );
      toast.success("Project berhasil diupdate");
      setShowEditProjectModal(false);
      loadProjectData();
    } catch (error) {
      toast.error(
        "Gagal update project: " + (error.response?.data?.error || ""),
      );
    }
  };

  const handleArchiveScenario = async (sid, title) => {
    if (!confirm(`Pindahkan "${title}" ke Archive?`)) return;

    try {
      await scenarioAPI.archive(sid);
      toast.success("Ticket diarsipkan");
      loadProjectData();
    } catch (error) {
      toast.error("Gagal archive ticket");
    }
  };

  const handleRestoreScenario = async (sid, title) => {
    if (!confirm(`Kembalikan "${title}" dari Archive?`)) return;

    try {
      await scenarioAPI.restore(sid);
      toast.success("Ticket dikembalikan");
      loadProjectData();
    } catch (error) {
      toast.error("Gagal restore ticket");
    }
  };

  const handleDeleteScenario = async (sid, title) => {
    const confirmTitle = prompt(
      `Ketik judul ticket untuk konfirmasi hapus permanen: ${title}`,
    );
    if (confirmTitle !== title) {
      toast.error("Judul tidak sesuai");
      return;
    }

    try {
      await scenarioAPI.deletePermanent(sid);
      toast.success("Ticket dihapus permanen");
      loadProjectData();
    } catch (error) {
      toast.error("Gagal hapus ticket: " + (error.response?.data?.error || ""));
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

  const handleClearTesterFilter = () => {
    setTesterFilter("");
  };

  // ============ HELPERS ============
  const getStatusColor = (status) => {
    const colors = {
      Done: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-500",
      "In Progress":
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-500",
      "Not Run":
        "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border-gray-500",
      Fail: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-500",
    };
    return colors[status] || colors["Not Run"];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Done":
        return <CheckCircle className="w-3 h-3" />;
      case "In Progress":
        return <Clock className="w-3 h-3" />;
      case "Fail":
        return <XCircle className="w-3 h-3" />;
      default:
        return <TrendingUp className="w-3 h-3" />;
    }
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return "N/A";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    return `${diffDays}d ${diffHours}h`;
  };

  const getFilteredPortfolio = () => {
    let filtered = allScenarios.filter((s) => !s.is_deleted);

    if (portfolioFilter === "active") {
      filtered = filtered.filter((s) => s.status !== "Done");
    } else if (portfolioFilter === "done") {
      filtered = filtered.filter((s) => s.status === "Done");
    }

    return filtered;
  };

  // ============ COMPUTED VALUES ============
  const activeScenarios = filteredScenarios.filter((s) => !s.is_deleted);
  const archivedScenarios = filteredScenarios.filter((s) => s.is_deleted);
  const displayScenarios =
    activeTab === "active" ? activeScenarios : archivedScenarios;
  const portfolioScenarios = getFilteredPortfolio();

  const totalActive = allScenarios.filter((s) => !s.is_deleted).length;
  const totalDone = allScenarios.filter(
    (s) => s.status === "Done" && !s.is_deleted,
  ).length;
  const totalInProgress = allScenarios.filter(
    (s) => s.status === "In Progress" && !s.is_deleted,
  ).length;
  const totalNotRun = allScenarios.filter(
    (s) => s.status === "Not Run" && !s.is_deleted,
  ).length;

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              📂 {project?.name}
            </h1>
            {project?.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {project.link}
              </a>
            )}
          </div>
          <button
            onClick={() => setShowEditProjectModal(true)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit Project
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Tambah Ticket
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Ticket"
            value={totalActive}
            color="blue"
            icon="🎫"
          />
          <StatCard label="Done" value={totalDone} color="green" icon="✓" />
          <StatCard
            label="In Progress"
            value={totalInProgress}
            color="yellow"
            icon="⏳"
          />
          <StatCard
            label="Not Run"
            value={totalNotRun}
            color="gray"
            icon="📋"
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ticket..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Semua Status</option>
                <option value="Done">Done</option>
                <option value="In Progress">In Progress</option>
                <option value="Not Run">Not Run</option>
                <option value="Fail">Fail</option>
              </select>
            </div>

            {/* Tester Filter (NEW) */}
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <select
                value={testerFilter}
                onChange={(e) => setTesterFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">👥 Semua Tester</option>
                {users.map((u) => (
                  <option key={u.id} value={u.full_name || u.username}>
                    {u.full_name || u.username} ({u.role})
                  </option>
                ))}
              </select>
              {testerFilter && (
                <button
                  onClick={handleClearTesterFilter}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Info */}
          {(testerFilter || searchQuery || statusFilter !== "all") && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>🔍 Filter aktif:</span>
              {testerFilter && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-xs">
                  Tester: <strong>{testerFilter}</strong>
                </span>
              )}
              {searchQuery && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs">
                  Search: <strong>"{searchQuery}"</strong>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded text-xs">
                  Status: <strong>{statusFilter}</strong>
                </span>
              )}
              <span className="ml-auto">
                Menampilkan <strong>{filteredScenarios.length}</strong> dari{" "}
                <strong>{allScenarios.length}</strong> ticket
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === "active"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <FolderArchive className="w-4 h-4 inline mr-2" />
                    Active ({activeScenarios.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("archived")}
                    className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === "archived"
                        ? "border-purple-500 text-purple-600 dark:text-purple-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <Archive className="w-4 h-4 inline mr-2" />
                    Archived ({archivedScenarios.length})
                  </button>
                </nav>
              </div>

              {/* Tickets List */}
              <div className="p-6">
                {displayScenarios.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">
                      {activeTab === "active" ? "🎫" : "📦"}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      {searchQuery || statusFilter !== "all" || testerFilter
                        ? "Tidak ada ticket yang sesuai filter"
                        : activeTab === "active"
                          ? "Belum ada ticket aktif"
                          : "Belum ada ticket yang diarchive"}
                    </p>
                    {testerFilter && (
                      <button
                        onClick={handleClearTesterFilter}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Clear Filter Tester
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayScenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/scenario/${scenario.id}`)}
                          >
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                              {scenario.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                              <span>ID: #{scenario.id}</span>
                              {scenario.testers && (
                                <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                  <User className="w-3 h-3" />
                                  {scenario.testers}
                                </span>
                              )}
                              {scenario.start_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {scenario.start_date}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                                scenario.status,
                              )}`}
                            >
                              {getStatusIcon(scenario.status)}
                              {scenario.status}
                            </span>

                            {activeTab === "active" ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingScenario(scenario);
                                    setRenameTitle(scenario.title);
                                    setShowRenameModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                  title="Rename Ticket"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveScenario(
                                      scenario.id,
                                      scenario.title,
                                    );
                                  }}
                                  className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                                  title="Archive Ticket"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreScenario(
                                      scenario.id,
                                      scenario.title,
                                    );
                                  }}
                                  className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                  title="Restore Ticket"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteScenario(
                                      scenario.id,
                                      scenario.title,
                                    );
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Hapus Permanen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Portfolio Timeline - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Portfolio Timeline
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {portfolioScenarios.length} tickets
                </span>
              </div>

              {/* Portfolio Filters */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setPortfolioFilter("all")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    portfolioFilter === "all"
                      ? "bg-gray-800 dark:bg-gray-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPortfolioFilter("active")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                    portfolioFilter === "active"
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Active
                </button>
                <button
                  onClick={() => setPortfolioFilter("done")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                    portfolioFilter === "done"
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  Done
                </button>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        TICKET
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        STATUS
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        START
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        END
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        DURATION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioScenarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm"
                        >
                          Tidak ada ticket
                        </td>
                      </tr>
                    ) : (
                      portfolioScenarios.map((scenario) => (
                        <tr
                          key={scenario.id}
                          className="border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          onClick={() => navigate(`/scenario/${scenario.id}`)}
                        >
                          <td
                            className="py-2 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[100px]"
                            title={scenario.title}
                          >
                            {scenario.title}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                scenario.status,
                              )}`}
                            >
                              {scenario.status}
                            </span>
                          </td>
                          <td className="py-2 text-gray-600 dark:text-gray-400 text-xs">
                            {scenario.start_date || "-"}
                          </td>
                          <td className="py-2 text-gray-600 dark:text-gray-400 text-xs">
                            {scenario.end_date || "-"}
                          </td>
                          <td className="py-2 font-medium text-blue-600 dark:text-blue-400 text-xs">
                            {calculateDuration(
                              scenario.start_date,
                              scenario.end_date,
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              ➕ Tambah Ticket
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Judul Ticket
              </label>
              <input
                type="text"
                value={newScenarioTitle}
                onChange={(e) => setNewScenarioTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Contoh: Testing Login Feature"
                autoFocus
                onKeyPress={(e) => e.key === "Enter" && handleAddScenario()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewScenarioTitle("");
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddScenario}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
              >
                💾 Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Ticket Modal */}
      {showRenameModal && editingScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              ✏️ Rename Ticket
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Judul Baru
              </label>
              <input
                type="text"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Masukkan judul baru"
                autoFocus
                onKeyPress={(e) => e.key === "Enter" && handleRenameScenario()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setEditingScenario(null);
                  setRenameTitle("");
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleRenameScenario}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
              >
                💾 Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              ✏️ Edit Project
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nama Project
                </label>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Nama project"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link (Opsional)
                </label>
                <input
                  type="text"
                  value={editProjectLink}
                  onChange={(e) => setEditProjectLink(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="https://jira.example.com/project"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditProjectModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleEditProject}
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

function StatCard({ label, value, color, icon }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-600 dark:text-green-400",
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-600 dark:text-yellow-400",
    gray: "bg-gray-50 dark:bg-gray-700 border-gray-500 text-gray-600 dark:text-gray-400",
  };

  return (
    <div className={`${colors[color]} border-l-4 rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="text-2xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}
