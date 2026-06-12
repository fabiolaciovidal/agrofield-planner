
const normalizeHeader = (value: string) =>
    value
        .trim()
        .replace(/^\uFEFF/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '_');

const splitCSVLine = (line: string): string[] => {
    const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && next === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
};

export const parseCSV = (content: string): Record<string, string>[] => {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return [];

    const headers = splitCSVLine(lines[0]).map(normalizeHeader);
    const results: Record<string, string>[] = [];

    for (const line of lines.slice(1)) {
        const values = splitCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        results.push(row);
    }

    return results;
};

export const downloadTemplate = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};
