import { useState } from "react";
import toast from "react-hot-toast";
import { X, Sparkles } from "lucide-react";
import { aiAPI } from "../services/api";

export default function AIModal({ open, onClose, sid, onGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Prompt tidak boleh kosong");
      return;
    }

    setLoading(true);
    try {
      await aiAPI.generate(sid, prompt);
      toast.success("AI berhasil generate test cases!");
      setPrompt("");
      onGenerated();
      onClose();
    } catch (error) {
      toast.error("Gagal generate: " + (error.response?.data?.error || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Multi-Generator
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Instruksi untuk AI
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[120px]"
              placeholder="Contoh: buatkan test case untuk fitur login dengan validasi email dan password"
              autoFocus
            />
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-800 dark:text-purple-300">
              <strong>💡 Tips:</strong> Berikan instruksi yang spesifik dan
              detail untuk hasil terbaik. Contoh: "Test login, registrasi user,
              forgot password, dan validasi input"
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
