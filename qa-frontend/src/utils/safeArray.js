/**
 * Helper untuk memastikan data adalah array sebelum di-map
 * @param {*} data - Data yang mungkin array, object, null, atau undefined
 * @returns {Array} - Array yang aman untuk di-map
 */
export const safeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  // Jika data adalah object dengan property 'data' yang array
  if (typeof data === "object" && data.data && Array.isArray(data.data)) {
    return data.data;
  }

  // Jika data adalah object, convert ke array
  if (typeof data === "object") {
    return Object.values(data);
  }

  return [];
};
