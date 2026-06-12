/**
 * Utility to export data to CSV and trigger download in browser.
 */
export const exportToCSV = (filename: string, headers: string[], data: any[]) => {
    if (!data || !data.length) {
        alert("No hay datos para exportar.");
        return;
    }

    const csvRows = [];
    
    // Header
    csvRows.push(headers.join(';'));

    // Rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] || '';
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(';'));
    }

    const csvContent = "\uFEFF" + csvRows.join('\n'); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
