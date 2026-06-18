import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { safeArray } from "../utils/safeArray";
import {
  ArrowLeft,
  Download,
  Plus,
  Sparkles,
  Upload,
  Trash2,
  CheckCircle,
} from "lucide-react";
import {
  scenarioAPI,
  testCaseAPI,
  attachmentAPI,
  aiAPI,
  importAPI,
  authAPI,
  dashboardAPI,
} from "../services/api";
import Navbar from "../components/Navbar";
import TestCaseTable from "../components/TestCaseTable";
import AttachmentModal from "../components/AttachmentModal";
import AIModal from "../components/AIModal";
import ImportModal from "../components/ImportModal";

export default function Scenario() {
  const { sid } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState(null);
  const [project, setProject] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTCs, setSelectedTCs] = useState([]);
  const [highlightedTC, setHighlightedTC] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);
  const scrollPositionRef = useRef(0);
  const TABLE_CONTAINER_REF = useRef(null);

  // Metadata edit state
  const [showMetaEdit, setShowMetaEdit] = useState(false);
  const [metaData, setMetaData] = useState({
    link: "",
    testers: "",
    start_date: "",
    end_date: "",
  });

  // Users for dropdown
  const [users, setUsers] = useState([]);

  // Modals
  const [attachModal, setAttachModal] = useState({
    open: false,
    tcId: null,
    type: "img",
  });
  const [aiModal, setAiModal] = useState(false);
  const [importModal, setImportModal] = useState(false);

  useEffect(() => {
    loadUser();
    loadUsers();
    loadScenarioData();
    const interval = setInterval(() => loadSummary(), 30000);

    // ✅ AUTO-SCROLL KE TOOLBAR SAAT PAGE LOAD/RELOAD
    const timer = setTimeout(() => {
      const toolbar = document.querySelector(".sticky-toolbar");
      if (toolbar) {
        toolbar.scrollIntoView({ behavior: "instant", block: "start" });
      }
    }, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [sid]);

  // Restore scroll position saat component mount
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(`scenario-${sid}-scroll`);

    const scrollToPosition = () => {
      if (TABLE_CONTAINER_REF.current) {
        if (savedPosition) {
          const position = parseInt(savedPosition, 10);
          TABLE_CONTAINER_REF.current.scrollTop = position;
        } else {
          // Jika tidak ada saved position, scroll ke toolbar
          const toolbar = document.querySelector(".sticky-toolbar");
          if (toolbar) {
            toolbar.scrollIntoView({ behavior: "instant", block: "start" });
          }
        }
      }
    };

    // Delay agar data & DOM sudah render
    const timer = setTimeout(scrollToPosition, 300);

    return () => {
      clearTimeout(timer);
      // Save scroll position saat component unmount
      if (TABLE_CONTAINER_REF.current) {
        sessionStorage.setItem(
          `scenario-${sid}-scroll`,
          TABLE_CONTAINER_REF.current.scrollTop.toString(),
        );
      }
    };
  }, [sid]);

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

  const loadScenarioData = async () => {
    try {
      setLoading(true);
      const response = await scenarioAPI.getById(sid);
      setScenario(response.data.scenario);
      setProject(response.data.project);
      setTestCases(response.data.test_cases || []);
      setStats(response.data.stats);
    } catch (error) {
      toast.error("Gagal load data scenario");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await testCaseAPI.getSummary(sid);
      setStats(res.data);
    } catch (error) {
      console.error("Failed to load summary:", error);
    }
  };

  const handleAddRow = async () => {
    try {
      const res = await testCaseAPI.add(sid);
      const newTC = {
        tc_id: res.data.tc_id,
        test_case: "",
        test_criteria: "",
        test_date: "",
        test_data: "",
        expected_result: "",
        actual_result: "",
        status: "Not Run",
        remarks: "",
        is_reviewed: false,
      };
      setTestCases([...testCases, newTC]);
      toast.success("Test case added");
    } catch (error) {
      toast.error("Gagal add test case");
    }
  };

  const debounceTimers = useRef({});

  const handleUpdateCell = useCallback(
    (tcId, field, value, immediate = false) => {
      // 1. Update local state LANGSUNG
      setTestCases((prev) =>
        safeArray(prev).map((tc) =>
          tc.tc_id === tcId ? { ...tc, [field]: value } : tc,
        ),
      );

      // 2. Field 'status' dan 'test_date' → langsung save
      if (field === "status" || field === "test_date" || immediate) {
        const key = `${tcId}-${field}`;
        if (debounceTimers.current[key]) {
          clearTimeout(debounceTimers.current[key]);
          delete debounceTimers.current[key];
        }

        testCaseAPI
          .update(sid, tcId, field, value)
          .then(() => {
            if (field === "status") loadSummary();
          })
          .catch((error) => {
            toast.error("Gagal save");
          });
        return;
      }

      // 3. Field lainnya (textarea) → DEBOUNCE 800ms
      const key = `${tcId}-${field}`;

      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }

      debounceTimers.current[key] = setTimeout(() => {
        testCaseAPI.update(sid, tcId, field, value).catch((error) => {
          toast.error("Gagal save");
        });
        delete debounceTimers.current[key];
      }, 800);
    },
    [sid],
  );

  const handleCellBlur = useCallback(() => {
    Object.keys(debounceTimers.current).forEach((key) => {
      clearTimeout(debounceTimers.current[key]);
      delete debounceTimers.current[key];
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ✅ HANDLE REORDER DENGAN BEFORE/AFTER TRACKING
  const handleReorder = async (newOrder) => {
    console.log("\n🚀 DRAG & DROP REORDER START");

    // 1. Ambil array tc_id dari state baru setelah di-drag
    const newOrderIds = newOrder.map((tc) => tc.tc_id);
    console.log("Urutan baru:", newOrderIds);

    try {
      // 2. Panggil API Backend
      const response = await testCaseAPI.reorder(sid, newOrderIds);
      const data = response.data;

      // 3. Log Before & After
      if (data.before && data.after) {
        console.group("📋 REORDER TRACKING LOG");

        console.log("BEFORE (Urutan Lama):");
        data.before.forEach((item, idx) => {
          console.log(
            `   [${idx + 1}] ${item.tc_id} | Attachments: ${item.attachments}`,
          );
        });

        console.log("AFTER (Urutan Baru):");
        data.after.forEach((item, idx) => {
          console.log(
            `   [${idx + 1}] ${item.tc_id} | Attachments: ${item.attachments}`,
          );
        });

        // Validasi cepat di frontend
        const totalBefore = data.before.reduce(
          (sum, item) => sum + item.attachments,
          0,
        );
        const totalAfter = data.after.reduce(
          (sum, item) => sum + item.attachments,
          0,
        );

        if (totalBefore === totalAfter) {
          console.log(
            `✅ SUCCESS: Total attachments aman (${totalAfter} files).`,
          );
        } else {
          console.error(
            `❌ ERROR: Attachment hilang! Before: ${totalBefore}, After: ${totalAfter}`,
          );
          toast.error("Ada attachment yang hilang saat reorder!");
        }

        console.groupEnd();
      }

      toast.success("Urutan test case diperbarui");

      // 4. WAJIB: Reload data dari server!
      await loadScenarioData();

      // 5. Kembalikan posisi scroll
      setTimeout(() => {
        if (TABLE_CONTAINER_REF.current) {
          const savedPosition = sessionStorage.getItem(
            `scenario-${sid}-scroll`,
          );
          if (savedPosition) {
            TABLE_CONTAINER_REF.current.scrollTop = parseInt(savedPosition, 10);
          }
        }
      }, 300);
    } catch (error) {
      console.error("❌ Reorder failed:", error);
      toast.error("Gagal mengubah urutan");
      await loadScenarioData();
    }
  };

  const handleDeleteRow = async (tcId) => {
    if (!confirm(`Hapus test case ${tcId}?`)) return;
    try {
      await testCaseAPI.delete(sid, tcId);
      toast.success("Test case deleted");
      await loadScenarioData();
    } catch (error) {
      toast.error("Gagal delete");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTCs.length === 0) return;
    if (!confirm(`Hapus ${selectedTCs.length} test case?`)) return;
    try {
      await testCaseAPI.bulkDelete(sid, selectedTCs);
      setSelectedTCs([]);
      toast.success(`${selectedTCs.length} test cases deleted`);
      await loadScenarioData();
    } catch (error) {
      toast.error("Gagal bulk delete");
    }
  };

  const handleCopyTC = async (sourceTcId) => {
    try {
      const res = await testCaseAPI.copy(sid, sourceTcId);
      toast.success(`Copied to ${res.data.new_tc_id}`);
      await loadScenarioData();
    } catch (error) {
      toast.error("Gagal copy test case");
    }
  };

  const handleExport = () => {
    const link = document.createElement("a");
    link.href = `/export/${sid}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Memulai export Excel...");
  };

  const handleMetaUpdate = async () => {
    try {
      await scenarioAPI.updateMeta(sid, metaData);
      toast.success("Metadata updated");
      setShowMetaEdit(false);
      setScenario({ ...scenario, ...metaData });
    } catch (error) {
      toast.error("Gagal update metadata");
    }
  };

  const saveScrollPosition = useCallback(() => {
    if (TABLE_CONTAINER_REF.current) {
      sessionStorage.setItem(
        `scenario-${sid}-scroll`,
        TABLE_CONTAINER_REF.current.scrollTop.toString(),
      );
    }
  }, [sid]);

  const handleToggleReview = async (tcId) => {
    saveScrollPosition();
    try {
      await testCaseAPI.toggleReview(sid, tcId);
      toast.success("Review status updated");
      await loadScenarioData();

      setTimeout(() => {
        if (TABLE_CONTAINER_REF.current) {
          const savedPosition = sessionStorage.getItem(
            `scenario-${sid}-scroll`,
          );
          if (savedPosition) {
            TABLE_CONTAINER_REF.current.scrollTop = parseInt(savedPosition, 10);
          }
        }
      }, 300);
    } catch (error) {
      toast.error("Gagal update review status");
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

  const filteredTestCases =
    statusFilter === "all"
      ? testCases
      : testCases.filter((tc) => tc.status === statusFilter);

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

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`/project/${project?.id}`)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              🧪 {scenario?.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Status: <span className="font-medium">{scenario?.status}</span>
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>

        {/* Metadata Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              📋 Ticket Metadata
            </h3>
            {!showMetaEdit ? (
              <button
                onClick={() => {
                  setMetaData({
                    link: scenario?.link || "",
                    testers: scenario?.testers || "",
                    start_date: scenario?.start_date || "",
                    end_date: scenario?.end_date || "",
                  });
                  setShowMetaEdit(true);
                }}
                className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                ✏️ Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMetaEdit(false)}
                  className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMetaUpdate}
                  className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  💾 Save
                </button>
              </div>
            )}
          </div>

          {!showMetaEdit ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">
                  Link
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {scenario?.link || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">
                  Testers
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {scenario?.testers || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">
                  Start Date
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {scenario?.start_date || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">
                  End Date
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {scenario?.end_date || "-"}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Link
                </label>
                <input
                  type="text"
                  value={metaData.link}
                  onChange={(e) =>
                    setMetaData({ ...metaData, link: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Testers (Multi-select)
                </label>
                <select
                  multiple
                  value={
                    metaData.testers
                      ? safeArray(metaData.testers.split(",")).map((t) =>
                          t.trim(),
                        )
                      : []
                  }
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (opt) => opt.value,
                    );
                    setMetaData({ ...metaData, testers: selected.join(", ") });
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  size={3}
                >
                  {safeArray(users).map((u) => (
                    <option key={u.id} value={u.full_name || u.username}>
                      {u.full_name || u.username} ({u.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hold Ctrl/Cmd untuk pilih multiple
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={metaData.start_date}
                  onChange={(e) =>
                    setMetaData({ ...metaData, start_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={metaData.end_date}
                  onChange={(e) =>
                    setMetaData({ ...metaData, end_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <SummaryCard
              label="Total"
              value={stats.total}
              color="blue"
              icon="📊"
            />
            <SummaryCard
              label="Pass"
              value={stats.pass}
              color="green"
              icon="✓"
            />
            <SummaryCard label="Fail" value={stats.fail} color="red" icon="✗" />
            <SummaryCard
              label="Not Run"
              value={stats.not_run}
              color="gray"
              icon=""
            />
            <SummaryCard
              label="In Progress"
              value={stats.in_progress}
              color="yellow"
              icon="⏳"
            />
            <SummaryCard
              label="Reviewed"
              value={stats.reviewed || 0}
              color="cyan"
              icon="✓"
            />
          </div>
        )}

        {/* ✅ STICKY TOOLBAR */}
        <div className="sticky-toolbar sticky top-0 z-30 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm py-3 mb-6 shadow-lg border-b border-gray-200 dark:border-gray-700">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Status</option>
                <option value="Not Run">Not Run</option>
                <option value="In Progress">In Progress</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>

              <button
                onClick={() => setAiModal(true)}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Multi-Gen
              </button>

              <button
                onClick={() => setImportModal(true)}
                className="px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Import Excel
              </button>

              <button
                onClick={handleAddRow}
                className="px-3 py-1.5 text-sm border border-green-300 dark:border-green-600 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>

              {selectedTCs.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus ({selectedTCs.length}
                  )
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Test Case Table */}
        <div
          ref={TABLE_CONTAINER_REF}
          onScroll={saveScrollPosition}
          className="max-h-[calc(100vh-150px)] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <TestCaseTable
            testCases={filteredTestCases}
            selectedTCs={selectedTCs}
            setSelectedTCs={setSelectedTCs}
            highlightedTC={highlightedTC}
            setHighlightedTC={setHighlightedTC}
            onUpdateCell={handleUpdateCell}
            onDelete={handleDeleteRow}
            onReorder={handleReorder}
            onCellBlur={handleCellBlur}
            onCopy={handleCopyTC}
            onOpenAttachment={(tcId, type) => {
              console.log("📍 onOpenAttachment called with:", { tcId, type });
              setAttachModal({ open: true, tcId, type });
            }}
            onToggleReview={handleToggleReview}
            userRole={user?.role}
            sid={sid}
          />
        </div>
      </div>

      {/* Modals */}
      {attachModal.open && (
        <AttachmentModal
          open={attachModal.open}
          onClose={() =>
            setAttachModal({ open: false, tcId: null, type: "img" })
          }
          tcId={attachModal.tcId}
          type={attachModal.type}
          sid={sid}
        />
      )}
      {aiModal && (
        <AIModal
          open={aiModal}
          onClose={() => setAiModal(false)}
          sid={sid}
          onGenerated={() => loadScenarioData()}
        />
      )}
      {importModal && (
        <ImportModal
          open={importModal}
          onClose={() => setImportModal(false)}
          sid={sid}
          onImported={() => loadScenarioData()}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-600 dark:text-green-400",
    red: "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400",
    gray: "bg-gray-50 dark:bg-gray-700 border-gray-500 text-gray-600 dark:text-gray-400",
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-600 dark:text-yellow-400",
    cyan: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 text-cyan-600 dark:text-cyan-400",
  };

  return (
    <div className={`${colors[color]} border-l-4 rounded-lg p-3`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 mb-1">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <div className="text-xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}
