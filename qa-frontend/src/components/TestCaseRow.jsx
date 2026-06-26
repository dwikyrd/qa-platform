import { useRef, useEffect, useState } from "react";
import {
  Trash2,
  Copy,
  Image as ImageIcon,
  FileText,
  GripVertical,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { attachmentAPI } from "../services/api";
import { safeArray } from "../utils/safeArray";

export default function TestCaseRow({
  tc,
  isSelected,
  isHighlighted,
  isDragging,
  isDropTarget,
  isDragDisabled,
  onSelect,
  onHighlight,
  onUpdateCell,
  onBlur,
  onDelete,
  onCopy,
  onOpenAttachment,
  onToggleReview,
  userRole,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const textareaRefs = useRef({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [imageCount] = useState(0);

  const autoResizeTextarea = (field) => {
    const el = textareaRefs.current[field];
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  };

  // Auto-resize saat component mount atau data berubah
  useEffect(() => {
    const fields = [
      "test_case",
      "test_criteria",
      "test_data",
      "expected_result",
      "actual_result",
      "remarks",
    ];
    setTimeout(() => {
      fields.forEach((field) => autoResizeTextarea(field));
    }, 50);
  }, [tc]);

  const handleChange = (field, value) => {
    onUpdateCell(tc.tc_id, field, value);
    setTimeout(() => autoResizeTextarea(field), 0);
  };

  const handleBlur = (field) => {
    if (onBlur) onBlur();
    autoResizeTextarea(field);
  };

  const getStatusColor = (status) => {
    const colors = {
      Pass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      Fail: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      "In Progress":
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
      "Not Run":
        "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400",
    };
    return colors[status] || colors["Not Run"];
  };

  // Load images for lightbox
  const handleImageClick = async () => {
    try {
      const response = await attachmentAPI.get(tc.scenario_id, tc.tc_id);
      const imgs = response.data.screenshots || [];

      if (imgs.length === 0) {
        onOpenAttachment(tc.tc_id, "img");
        return;
      }

      setImages(
        safeArray(imgs).map((img) => ({ src: img.url, title: img.name })),
      );
      setLightboxIndex(0);
      setLightboxOpen(true);
    } catch (error) {
      console.error("Failed to load images:", error);
      onOpenAttachment(tc.tc_id, "img");
    }
  };

  const canReview = userRole === "reviewer" || userRole === "admin";

  return (
    <>
      <tr
        draggable={!isDragDisabled}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onHighlight}
        className={`
          ${isDragging ? "opacity-40" : ""}
          ${isHighlighted ? "bg-blue-50 dark:bg-blue-900/20" : ""}
          ${tc.status === "Fail" ? "bg-red-50 dark:bg-red-900/10" : ""}
          ${tc.is_reviewed ? "border-l-4 border-purple-500" : ""}
          hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-move
        `}
      >
        {/* Checkbox */}
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded"
          />
        </td>

        {/* TC ID + Drag Handle + Review Status */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
            <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
              {tc.tc_id}
            </span>
            {tc.is_reviewed && (
              <CheckCircle
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
                title="Reviewed"
              />
            )}
          </div>
        </td>

        {/* Test Case */}
        <td className="px-3 py-2">
          <textarea
            ref={(el) => (textareaRefs.current.test_case = el)}
            value={tc.test_case || ""}
            onChange={(e) => handleChange("test_case", e.target.value)}
            onBlur={() => handleBlur("test_case")}
            className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded bg-transparent dark:text-gray-100 resize-none overflow-hidden"
            rows="1"
            placeholder="Test case description..."
          />
        </td>

        {/* Test Criteria */}
        <td className="px-3 py-2">
          <textarea
            ref={(el) => (textareaRefs.current.test_criteria = el)}
            value={tc.test_criteria || ""}
            onChange={(e) => handleChange("test_criteria", e.target.value)}
            onBlur={() => handleBlur("test_criteria")}
            className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded bg-transparent dark:text-gray-100 resize-none overflow-hidden"
            rows="1"
            placeholder="Criteria..."
          />
        </td>

        {/* Test Date */}
        <td className="px-3 py-2">
          <input
            type="date"
            value={tc.test_date || ""}
            onChange={(e) => handleChange("test_date", e.target.value)}
            className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded bg-transparent dark:text-gray-100"
          />
        </td>

        {/* Test Data */}
        <td className="px-3 py-2">
          <textarea
            ref={(el) => (textareaRefs.current.test_data = el)}
            value={tc.test_data || ""}
            onChange={(e) => handleChange("test_data", e.target.value)}
            onBlur={() => handleBlur("test_data")}
            className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded bg-transparent dark:text-gray-100 resize-none overflow-hidden"
            rows="1"
            placeholder="Test data..."
          />
        </td>

        {/* Expected Result */}
        <td className="px-3 py-2">
          <textarea
            ref={(el) => (textareaRefs.current.expected_result = el)}
            value={tc.expected_result || ""}
            onChange={(e) => handleChange("expected_result", e.target.value)}
            onBlur={() => handleBlur("expected_result")}
            className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded bg-transparent dark:text-gray-100 resize-none overflow-hidden"
            rows="1"
            placeholder="Expected result..."
          />
        </td>

        {/* Actual Result */}
        <td className="px-3 py-2">
          <textarea
            ref={(el) => (textareaRefs.current.actual_result = el)}
            value={tc.actual_result || ""}
            onChange={(e) => handleChange("actual_result", e.target.value)}
            onBlur={() => handleBlur("actual_result")}
            className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded bg-transparent dark:text-gray-100 resize-none overflow-hidden"
            rows="1"
            placeholder="Actual result..."
          />
        </td>

        {/* Status */}
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <select
            value={tc.status || "Not Run"}
            onChange={(e) => handleChange("status", e.target.value)}
            className={`w-full px-2 py-1 text-xs font-medium rounded border-0 ${getStatusColor(
              tc.status,
            )}`}
          >
            <option value="Not Run">Not Run</option>
            <option value="In Progress">In Progress</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
        </td>

        {/* Remarks */}
        <td className="px-3 py-2">
          <textarea
            ref={(el) => (textareaRefs.current.remarks = el)}
            value={tc.remarks || ""}
            onChange={(e) => handleChange("remarks", e.target.value)}
            onBlur={() => handleBlur("remarks")}
            className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded bg-transparent dark:text-gray-100 resize-none overflow-hidden"
            rows="1"
            placeholder="Remarks..."
          />
        </td>

        {/* Screenshot Button */}
        <td
          className="px-3 py-2 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              console.log("📷 Screenshot button clicked for:", tc.tc_id);
              onOpenAttachment(tc.tc_id, "img");
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Attachments"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </td>

        {/* Log Button */}
        <td
          className="px-3 py-2 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              console.log("📝 Log button clicked for:", tc.tc_id);
              onOpenAttachment(tc.tc_id, "log");
            }}
            className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded hover:bg-purple-50 dark:hover:bg-purple-900/20"
            title="Logs"
          >
            <FileText className="w-4 h-4" />
          </button>
        </td>

        {/* Actions - Include Review Button */}
        <td
          className="px-3 py-2 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-1">
            {canReview && (
              <button
                onClick={() => onToggleReview(tc.tc_id)}
                className={`p-1.5 transition-colors rounded ${
                  tc.is_reviewed
                    ? "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    : "text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                }`}
                title={tc.is_reviewed ? "Unmark Review" : "Mark as Reviewed"}
              >
                {tc.is_reviewed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={onCopy}
              className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20"
              title="Copy (Ctrl+D)"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Lightbox for image viewing with next/prev */}
      {lightboxOpen && images.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={images}
          index={lightboxIndex}
        />
      )}
    </>
  );
}
