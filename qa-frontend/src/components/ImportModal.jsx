import { useState } from "react";
import toast from "react-hot-toast";
import { X, Upload, FileSpreadsheet } from "lucide-react";
import { importAPI } from "../services/api";

export default function ImportModal({ open, onClose, sid, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  if (!open) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".xlsx")) {
        toast.error("Hanya file .xlsx yang diperbolehkan");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Pilih file dulu");
      return;
    }

    setLoading(true);
    setStatus("Uploading...");

    try {
      const response = await importAPI.importExcel(sid, file);
      setStatus(`✅ Berhasil import ${response.data.imported} test case!`);
      toast.success(`Import berhasil: ${response.data.imported} test cases`);

      setTimeout(() => {
        onImported();
        onClose();
      }, 1500);
    } catch (error) {
      setStatus(`❌ ${error.response?.data?.error || "Import gagal"}`);
      toast.error("Import gagal: " + (error.response?.data?.error || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            Import Test Cases
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload file .xlsx sesuai format export. Kolom bebas urutan,
              metadata diabaikan.
            </p>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="import-file-input"
              />
              <label
                htmlFor="import-file-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Pilih File
              </label>
              {file && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  📄 {file.name}
                </p>
              )}
            </div>
          </div>

          {status && (
            <div
              className={`p-3 rounded-lg mb-4 text-sm ${
                status.includes("✅")
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              {status}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !file}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
