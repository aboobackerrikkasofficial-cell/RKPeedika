import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, AlertCircle } from 'lucide-react';

export default function Table({ 
  columns, 
  data = [], 
  isLoading = false, 
  emptyMessage = "No items found in this section.",
  itemsPerPage = 5
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Handle column sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (sortConfig.key) {
      const sorted = [...data].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Format to string if it is numeric string
        if (typeof aVal === 'string' && aVal.startsWith('₹')) {
          aVal = parseFloat(aVal.replace(/[₹,]/g, ''));
          bVal = parseFloat(bVal.replace(/[₹,]/g, ''));
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
      return sorted;
    }
    return data;
  }, [data, sortConfig]);

  // Paginated split
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const goToPrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full no-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`py-3 px-4 select-none ${col.sortable ? 'cursor-pointer hover:bg-gray-100/70 text-gray-600 transition-all' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <ChevronsUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-600">
            {isLoading ? (
              // Loading state
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col, idx) => (
                    <td key={idx} className="py-4 px-4">
                      <div className="h-3.5 bg-gray-100 rounded w-2/3"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 text-gray-300 stroke-[1.5]" />
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              // Real data rows
              paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50/50 transition-all">
                  {columns.map((col) => (
                    <td key={col.key} className="py-3.5 px-4 font-medium text-gray-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {!isLoading && data.length > itemsPerPage && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-xs text-gray-400 font-semibold bg-gray-50/30">
          <div>
            Showing <strong className="text-gray-600">{startIndex + 1}</strong> to <strong className="text-gray-600">{Math.min(data.length, startIndex + itemsPerPage)}</strong> of <strong className="text-gray-600">{data.length}</strong> items
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-200 bg-white p-1 text-gray-500 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-gray-600 font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-200 bg-white p-1 text-gray-500 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
