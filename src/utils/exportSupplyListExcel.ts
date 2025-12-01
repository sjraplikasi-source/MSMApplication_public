// src/utils/exportSupplyListExcel.ts

import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

// Tipe untuk filter yang akan dikirim dari komponen
type SupplyListFilters = {
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    smFilter?: "all" | "needs_update" | "updated";
    statusFilter?: "validated_reviewed" | "all";
};

// Tipe data untuk kalkulasi status
type BacklogForStatusCalc = {
    supply_updated_at: string | null;
    backlog_spareparts: {
        stock_status: string | null;
        estimated_ready_date: string | null;
    }[];
};

// Helper untuk format tanggal
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("id-ID") : "");

// Helper untuk mendapatkan teks status Progress SM
const getSupplyStatusText = (backlog: BacklogForStatusCalc): string => {
    if (!backlog.supply_updated_at) return "Perlu Update";
    
    const parts = backlog.backlog_spareparts || [];
    if (parts.length === 0) return "Sudah Update (Tanpa Part)";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = parts.some(part => part.estimated_ready_date && new Date(part.estimated_ready_date) < today);
    if (isOverdue) return "Perlu Update Estimasi";

    const totalParts = parts.length;
    const readyParts = parts.filter(p => p.stock_status?.toLowerCase() === 'ready').length;
    if (totalParts > 0 && readyParts === totalParts) return "Semua Part Ready";
    if (readyParts > 0) return "Ready Parsial";

    return "Sudah Update";
};


export const exportSupplyListExcel = async (filters: SupplyListFilters) => {
    try {
        // 1. Ambil data backlog utama sesuai filter
        let query = supabase
            .from("backlogs")
            .select(`
                id, registration_code, unit_code, problem, date, status, supply_updated_at,
                backlog_spareparts (stock_status, estimated_ready_date)
            `)
            .eq("need_sparepart", true)
            .order("date", { ascending: false });

        // Terapkan filter dari UI
        //if (filters.statusFilter === "validated_reviewed") query = query.in("status", ["reviewed"]);
      if (filters.statusFilter === "validated_reviewed") query = query.in("status", ["validated", "reviewed"]);
        if (filters.q) {
            const p = `%${filters.q}%`;
            query = query.or(`registration_code.ilike.${p},unit_code.ilike.${p},problem.ilike.${p}`);
        }
        if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
        if (filters.dateTo) query = query.lte("date", filters.dateTo);
        if (filters.smFilter === "needs_update") query = query.is("supply_updated_at", null);
        if (filters.smFilter === "updated") query = query.not("supply_updated_at", "is", null);

        const { data: backlogs, error } = await query;
        if (error) throw error;
        
        if (!backlogs || backlogs.length === 0) {
            alert("Tidak ada data untuk di-download.");
            return;
        }

        const backlogIds = backlogs.map((b) => b.id);
        const codeMap = new Map<string, string>(
            backlogs.map((b) => [b.id, b.registration_code || b.id])
        );

        // 2. Siapkan Workbook Excel
        const wb = XLSX.utils.book_new();

        // Sheet 1: Supply List (Ringkasan)
        const supplyListRows = backlogs.map((b) => [
            fmtDate(b.date),
            b.registration_code ?? "",
            b.unit_code ?? "",
            b.problem ?? "",
            getSupplyStatusText(b as BacklogForStatusCalc),
            b.status ?? "",
        ]);

        const wsSupplyList = XLSX.utils.aoa_to_sheet([
            ["Tanggal", "Kode Registrasi", "Unit", "Problem", "Progress SM", "Status Backlog"],
            ...supplyListRows,
        ]);
        XLSX.utils.book_append_sheet(wb, wsSupplyList, "Supply List");

        // Sheet 2: Kebutuhan Part (Detail)
        const { data: spareparts } = await supabase
            .from("backlog_spareparts")
            .select("backlog_id, part_number, part_name, qty, stock_status, estimated_ready_date, no_wr_pr, no_po, remarks") // <-- KOLOM SATUAN DIHAPUS
            .in("backlog_id", backlogIds);
            
        const wsSpares = XLSX.utils.aoa_to_sheet([
            ["Backlog Kode", "Part Number", "Part Name", "Qty", "Stock Status", "Est. Ready", "No WR/PR", "No PO", "Remarks"], // <-- HEADER SATUAN DIHAPUS
            ...(spareparts || []).map((r: any) => [
                codeMap.get(r.backlog_id) ?? r.backlog_id,
                r.part_number ?? "",
                r.part_name ?? "",
                r.qty ?? "",
                // <-- KOLOM DATA SATUAN DIHAPUS
                r.stock_status ?? "",
                fmtDate(r.estimated_ready_date ?? null),
                r.no_wr_pr ?? "",
                r.no_po ?? "",
                r.remarks ?? "",
            ]),
        ]);
        XLSX.utils.book_append_sheet(wb, wsSpares, "Kebutuhan Part");

        // 3. Tulis file dan trigger download
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        XLSX.writeFile(wb, `Supply_List_${y}-${m}-${d}.xlsx`);

    } catch (e: any) {
        console.error("Error saat ekspor ke Excel:", e);
        alert(`Gagal mendownload file Excel: ${e.message}`);
    }
};