import { useState, useEffect } from "react";
import TestCaseRow from "./TestCaseRow";
import toast from "react-hot-toast";
import { safeArray } from "../utils/safeArray";

export default function TestCaseTable({
  testCases,
  selectedTCs,
  setSelectedTCs,
  highlightedTC,
  setHighlightedTC,
  onUpdateCell,
  onDelete,
  onCopy,
  onOpenAttachment,
  onToggleReview,
  onReorder, // ✅ WAJIB: dari Scenario.jsx
  onDragStart, // ✅ WAJIB: dari Scenario.jsx (untuk trigger loading overlay)
  isDragDisabled, // ✅ WAJIB: dari Scenario.jsx (untuk lock UI)
  userRole,
  sid,
}) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  // Ctrl+D untuk copy test case
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (highlightedTC) {
          onCopy(highlightedTC);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [highlightedTC, onCopy]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTCs(safeArray(testCases).map((tc) => tc.tc_id));
    } else {
      setSelectedTCs([]);
    }
  };

  const handleSelectTC = (tcId, checked) => {
    if (checked) {
      setSelectedTCs([...selectedTCs, tcId]);
    } else {
      setSelectedTCs(selectedTCs.filter((id) => id !== tcId));
    }
  };

  // ============================================
  // DRAG HANDLERS (dengan Loading Overlay Integration)
  // ============================================

  const handleDragStart = (e, tc) => {
    // 🚫 BLOCK DRAG jika UI sedang locked
    if (isDragDisabled) {
      e.preventDefault();
      return;
    }

    setDraggedItem(tc);

    // 🔒 TRIGGER LOADING OVERLAY di Scenario.jsx
    if (onDragStart) {
      onDragStart();
    }

    // Set efek visual untuk drag
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", tc.tc_id);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e, tc) => {
    e.preventDefault();

    // 🚫 BLOCK DROP jika UI sedang locked
    if (isDragDisabled) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    e.dataTransfer.dropEffect = "move";
    setDropTargetId(tc.tc_id);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (e, targetTc) => {
    e.preventDefault();
    e.stopPropagation();

    // 🚫 BLOCK DROP jika UI sedang locked atau tidak ada item yang di-drag
    if (
      isDragDisabled ||
      !draggedItem ||
      draggedItem.tc_id === targetTc.tc_id
    ) {
      setDropTargetId(null);
      return;
    }

    // Hitung urutan baru
    const oldIndex = testCases.findIndex(
      (tc) => tc.tc_id === draggedItem.tc_id,
    );
    const newIndex = testCases.findIndex((tc) => tc.tc_id === targetTc.tc_id);

    if (oldIndex === -1 || newIndex === -1) {
      setDropTargetId(null);
      return;
    }

    const newOrder = [...testCases];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    // Reset visual state
    setDraggedItem(null);
    setDropTargetId(null);

    // ✅ PANGGIL onReorder dari parent (Scenario.jsx)
    // Parent akan handle: Loading Overlay → API Call → Before/After Tracking → Reload Data → Unlock UI
    if (onReorder) {
      await onReorder(newOrder);
    } else {
      toast.error("onReorder function tidak tersedia");
    }
  };

  // Empty state
  if (testCases.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Belum ada test case
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
          Klik "Add Row" atau "AI Multi-Gen" untuk memulai
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-opacity duration-300 ${
        isDragDisabled ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* ✅ STICKY HEADER */}
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    selectedTCs.length === testCases.length &&
                    testCases.length > 0
                  }
                  className="rounded"
                  disabled={isDragDisabled}
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                TC ID
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Test Case
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Criteria
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Date
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Data
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Expected
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Actual
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Remarks
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                📷
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                📝
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {safeArray(testCases).map((tc) => (
              <TestCaseRow
                key={tc.tc_id}
                tc={tc}
                isSelected={selectedTCs.includes(tc.tc_id)}
                isHighlighted={highlightedTC === tc.tc_id}
                isDragging={draggedItem?.tc_id === tc.tc_id}
                isDropTarget={dropTargetId === tc.tc_id}
                isDragDisabled={isDragDisabled}
                onSelect={(checked) => handleSelectTC(tc.tc_id, checked)}
                onHighlight={() => setHighlightedTC(tc.tc_id)}
                onUpdateCell={onUpdateCell}
                onDelete={() => onDelete(tc.tc_id)}
                onCopy={() => onCopy(tc.tc_id)}
                onOpenAttachment={onOpenAttachment}
                onToggleReview={onToggleReview}
                userRole={userRole}
                onDragStart={(e) => handleDragStart(e, tc)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, tc)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, tc)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
