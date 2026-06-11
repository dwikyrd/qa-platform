import { useState, useEffect } from "react";
import TestCaseRow from "./TestCaseRow";
import { testCaseAPI } from "../services/api";
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
  userRole,
  sid,
}) {
  const [draggedItem, setDraggedItem] = useState(null);

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

  // Drag handlers
  const handleDragStart = (tc) => {
    setDraggedItem(tc);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetTc) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.tc_id === targetTc.tc_id) return;

    const oldIndex = testCases.findIndex(
      (tc) => tc.tc_id === draggedItem.tc_id,
    );
    const newIndex = testCases.findIndex((tc) => tc.tc_id === targetTc.tc_id);

    const newOrder = [...testCases];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    const newOrderIds = safeArray(newOrder).map((tc) => tc.tc_id);

    try {
      await testCaseAPI.reorder(sid, newOrderIds);
      toast.success("Test cases reordered");
      // Reload data untuk update TC ID numbering
      window.location.reload();
    } catch (error) {
      toast.error("Gagal reorder test cases");
      console.error(error);
    }
  };

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
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
                onSelect={(checked) => handleSelectTC(tc.tc_id, checked)}
                onHighlight={() => setHighlightedTC(tc.tc_id)}
                onUpdateCell={onUpdateCell}
                onDelete={() => onDelete(tc.tc_id)}
                onCopy={() => onCopy(tc.tc_id)}
                onOpenAttachment={onOpenAttachment}
                onToggleReview={onToggleReview}
                userRole={userRole}
                onDragStart={() => handleDragStart(tc)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tc)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
