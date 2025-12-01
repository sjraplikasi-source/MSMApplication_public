// src/pages/columns.ts
import { ColumnDef } from '@tanstack/react-table';

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'wo_number',
    header: 'WO Number',
  },
  {
    accessorKey: 'equipment.code',
    header: 'Equipment Code',
    cell: ({ row }) => row.original.equipment?.code || '-',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'created_at',
    header: 'Tanggal',
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleString(),
  },
];
