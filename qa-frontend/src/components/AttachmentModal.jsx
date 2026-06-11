import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  X,
  Upload,
  Eye,
  Trash2,
  Edit3,
  Maximize2,
  XCircle,
} from "lucide-react";
import { attachmentAPI } from "../services/api";
import { safeArray } from "../utils/safeArray";

export default function AttachmentModal({ open, onClose, tcId, type, sid }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [logText, setLogText] = useState("");
  const [customName, setCustomName] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [previewLog, setPreviewLog] = useState(null);

  console.log("📥 AttachmentModal render:", { open, tcId, type, sid });

  // ✅ TAMBAHKAN: Handler untuk paste screenshot
  const handlePaste = useCallback(
    async (e) => {
      if (type !== "img" || !open) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();

          if (blob) {
            console.log("📋 Image pasted from clipboard:", blob);

            try {
              toast.loading("Uploading pasted image...");
              await attachmentAPI.uploadImage(sid, tcId, blob);
              toast.dismiss();
              toast.success("Screenshot pasted & uploaded!");
              await loadAttachments();
            } catch (error) {
              toast.dismiss();
              toast.error("Failed to upload pasted image");
              console.error("Paste upload error:", error);
            }
          }
          break;
        }
      }
    },
    [type, open, sid, tcId],
  );

  // ✅ TAMBAHKAN: Setup & cleanup paste listener
  useEffect(() => {
    if (open && type === "img") {
      document.addEventListener("paste", handlePaste);
      return () => {
        document.removeEventListener("paste", handlePaste);
      };
    }
  }, [open, type, handlePaste]);

  useEffect(() => {
    if (open && tcId && sid) {
      console.log("✅ Modal opened - Type:", type);
      console.log("🔄 Loading attachments for:", { sid, tcId, type });

      // Reset semua state
      setFile(null);
      setLogText("");
      setCustomName("");
      setPreviewImage(null);
      setPreviewLog(null);

      loadAttachments();
    }
  }, [open, tcId, sid, type]);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const response = await attachmentAPI.get(sid, tcId);
      console.log("📎 API Response:", response);

      const items =
        type === "img" ? response.data.screenshots : response.data.logs;
      console.log("📎 Attachments loaded:", items);

      setAttachments(items || []);

      if (items && items.length > 0) {
        toast.success(
          `Found ${items.length} ${type === "img" ? "image" : "log"}(s)`,
        );
      }
    } catch (error) {
      console.error("❌ Failed to load attachments:", error);
      toast.error("Gagal load attachments");
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    console.log("📤 handleFileUpload called - File:", file);

    if (!file) {
      toast.error("Pilih file dulu");
      return;
    }

    try {
      await attachmentAPI.uploadImage(sid, tcId, file);
      toast.success("Upload berhasil");
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById("file-upload-input");
      if (fileInput) {
        fileInput.value = "";
      }

      await loadAttachments();
    } catch (error) {
      console.error("❌ Upload error:", error);
      toast.error("Upload gagal: " + (error.response?.data?.error || ""));
    }
  };

  const handleLogSave = async () => {
    console.log("💾 handleLogSave called - Text:", logText);

    if (!logText.trim()) {
      toast.error("Isi log dulu");
      return;
    }

    try {
      await attachmentAPI.saveLog(sid, tcId, logText, customName);
      toast.success("Log berhasil disimpan");
      setLogText("");
      setCustomName("");
      await loadAttachments();
    } catch (error) {
      console.error("Save log error:", error);
      toast.error("Gagal save log");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus attachment ini?")) return;

    try {
      if (type === "img") {
        await attachmentAPI.deleteImage(sid, id);
      } else {
        await attachmentAPI.deleteLog(sid, id);
      }
      toast.success("Attachment dihapus");
      await loadAttachments();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Gagal hapus attachment");
    }
  };

  const handleRename = async (id, newName) => {
    try {
      await attachmentAPI.rename(sid, id, type, newName);
      toast.success("Rename berhasil");
      await loadAttachments();
    } catch (error) {
      console.error("Rename error:", error);
      toast.error("Gagal rename");
    }
  };

  const handleImageClick = (url) => {
    console.log("👁️ handleImageClick called - URL:", url);
    setPreviewImage(url);
  };

  const handleLogClick = (item) => {
    console.log("👁️ handleLogClick called - Item:", item);
    setPreviewLog({
      name: item.name,
      content: item.content,
    });
  };

  const handleClose = () => {
    console.log("🚪 handleClose called");

    // Reset semua state
    setFile(null);
    setLogText("");
    setCustomName("");
    setPreviewImage(null);
    setPreviewLog(null);

    // Reset file input
    const fileInput = document.getElementById("file-upload-input");
    if (fileInput) {
      fileInput.value = "";
    }

    onClose();
  };

  if (!open) {
    console.log("❌ Modal not open - returning null");
    return null;
  }

  console.log("✅ Rendering modal - Type:", type);
  console.log("📋 Attachments:", attachments);

  return (
    <>
      {/* MAIN MODAL */}
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {type === "img" ? "📷 Screenshots" : "📝 Logs"} for {tcId}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* ============================================ */}
            {/* UPLOAD FORM - SELALU MUNCUL */}
            {/* ============================================ */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
              {type === "img" ? (
                // FORM UPLOAD IMAGE
                <div>
                  <label className="block text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">
                    📤 Upload Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="file-upload-input"
                      accept="image/*"
                      onChange={(e) => {
                        console.log("📁 File selected:", e.target.files[0]);
                        setFile(e.target.files[0]);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={handleFileUpload}
                      disabled={!file}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                  </div>
                  {file && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                      ✓ Selected: {file.name} ({(file.size / 1024).toFixed(2)}{" "}
                      KB)
                    </p>
                  )}
                  {/* ✅ TAMBAHKAN: Hint untuk paste */}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    💡 Tip: Copy screenshot lalu tekan{" "}
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                      Ctrl+V
                    </kbd>{" "}
                    untuk paste langsung
                  </p>
                </div>
              ) : (
                // FORM UPLOAD LOG
                <div>
                  <label className="block text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">
                    📝 Paste/Type Log Text
                  </label>
                  <textarea
                    value={logText}
                    onChange={(e) => {
                      console.log("📝 Log text changed");
                      setLogText(e.target.value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
                    rows="4"
                    placeholder="Tempel log error di sini..."
                  />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Nama log (opsional)"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
                  />
                  <button
                    onClick={handleLogSave}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    💾 Save Log
                  </button>
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* ATTACHMENTS LIST */}
            {/* ============================================ */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                📋 Existing Attachments: ({attachments.length} items)
              </h3>

              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2">Loading...</p>
                </div>
              ) : attachments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-lg font-medium">No attachments yet</p>
                  <p className="text-sm mt-2">
                    Upload {type === "img" ? "gambar" : "log"} pertama Anda
                    menggunakan form di atas
                    {type === "img" && " atau paste dengan Ctrl+V"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {safeArray(attachments).map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                    >
                      {type === "img" ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-20 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity border-2 border-gray-300 dark:border-gray-600"
                          onClick={() => {
                            console.log(`🖼️ Image ${index} clicked:`, item.url);
                            handleImageClick(item.url);
                          }}
                          onError={(e) => {
                            console.error("❌ Failed to load image:", item.url);
                            e.target.src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='64'%3E%3Crect fill='%23ccc' width='80' height='64'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div
                          className="w-20 h-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-2 border-gray-300 dark:border-gray-600"
                          onClick={() => {
                            console.log(`📄 Log ${index} clicked:`, item);
                            handleLogClick(item);
                          }}
                        >
                          <span className="text-2xl">📄</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          defaultValue={item.name}
                          onBlur={(e) => handleRename(item.id, e.target.value)}
                          className="w-full px-2 py-1 text-sm font-medium border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded bg-transparent dark:text-gray-100 truncate"
                        />
                        {type === "log" && item.content && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {item.content.substring(0, 60)}...
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            type === "img"
                              ? handleImageClick(item.url)
                              : handleLogClick(item)
                          }
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                          title="Preview"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors bg-red-50 dark:bg-red-900/30 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* IMAGE PREVIEW MODAL */}
      {/* ============================================ */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-[60] flex items-center justify-center p-4">
          <button
            onClick={() => {
              console.log("❌ Closing image preview");
              setPreviewImage(null);
            }}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
          >
            <XCircle className="w-8 h-8" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* ============================================ */}
      {/* LOG PREVIEW MODAL */}
      {/* ============================================ */}
      {previewLog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Log Preview: {previewLog.name}
              </h3>
              <button
                onClick={() => {
                  console.log("❌ Closing log preview");
                  setPreviewLog(null);
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-900">
              <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap break-all">
                {previewLog.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
