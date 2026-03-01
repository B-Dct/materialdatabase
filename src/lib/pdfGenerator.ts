import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, ProjectMaterialList, ProjectProcessList } from '@/types/domain';

export const exportMaterialListPdf = (project: Project, list: ProjectMaterialList, items: any[], materials: any[]) => {
    const doc = new jsPDF();

    // Title & Header
    doc.setFontSize(18);
    doc.text(`Material BOM: ${list.name}`, 14, 22);

    doc.setFontSize(11);
    doc.text(`Project: ${project.projectNumber} - ${project.name}`, 14, 30);
    doc.text(`Revision: ${list.revision}`, 14, 36);
    doc.text(`Status: ${list.status.toUpperCase()}`, 14, 42);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 48);

    // Table Data
    const tableData = items.map(item => {
        const mat = materials.find((m: any) => m.id === item.materialId);
        const variant = mat?.variants?.find((v: any) => v.id === item.variantId);

        return [
            item.materialName || mat?.name || 'Unknown Material',
            item.variantName || variant?.name || '-',
            item.quantity.toString(),
            item.notes || ''
        ];
    });

    autoTable(doc, {
        startY: 55,
        head: [['Material', 'Variant', 'Quantity', 'Notes']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] }
    });

    // Save
    doc.save(`${project.projectNumber}_${list.name}_Rev${list.revision}.pdf`);
};

export const exportProcessListPdf = (project: Project, list: ProjectProcessList, items: any[], processes: any[]) => {
    const doc = new jsPDF();

    // Title & Header
    doc.setFontSize(18);
    doc.text(`Process Plan: ${list.name}`, 14, 22);

    doc.setFontSize(11);
    doc.text(`Project: ${project.projectNumber} - ${project.name}`, 14, 30);
    doc.text(`Revision: ${list.revision}`, 14, 36);
    doc.text(`Status: ${list.status.toUpperCase()}`, 14, 42);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 48);

    // Table Data
    const tableData = items.map((item, index) => {
        const proc = processes.find((p: any) => p.id === item.processId);

        return [
            (index + 1).toString(),
            item.processName || proc?.name || 'Unknown Process',
            item.notes || ''
        ];
    });

    autoTable(doc, {
        startY: 55,
        head: [['#', 'Process', 'Notes/Params']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] }
    });

    // Save
    doc.save(`${project.projectNumber}_${list.name}_Rev${list.revision}.pdf`);
};
