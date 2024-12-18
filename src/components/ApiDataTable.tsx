import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DataTable, DataTablePageEvent, DataTableSelectionEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';

interface FetchedData {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string | null;
  date_start: number;
  date_end: number;
}

interface ApiResponse {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
  };
  data: FetchedData[];
}

const ApiDataTable: React.FC = () => {
  const [data, setData] = useState<FetchedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [params, setParams] = useState({
    page: 1,
    rows: 12,
  });
  
  const [selectedDataIds, setSelectedDataIds] = useState<Set<number>>(new Set());
  const [selectCount, setSelectCount] = useState<number | null>(null);
  const op = useRef<OverlayPanel>(null);

  useEffect(() => {
    loadData();
  }, [params]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await axios.get<ApiResponse>(`https://api.artic.edu/api/v1/artworks`, {
        params: {
          page: params.page,
          limit: params.rows,
        }
      });
      setData(response.data.data);
      setTotalRecords(response.data.pagination.total);
    } catch (error) {
      console.error('Error in fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onPage = (event: DataTablePageEvent) => {
    setParams({
      ...params,
      page: (event.first! / event.rows!) + 1,
      rows: event.rows!
    });
  };

  const selectMultipleRows = async (count: number) => {
    if (!count) return;
    setLoading(true);
    const totalPages = Math.ceil(count / params.rows);
    let remainingCount = count;
    const newSelectedIds = new Set(selectedDataIds);

    for (let i = 0; i < totalPages; i++) {
      const pageToFetch = params.page + i;
      try {
        const response = await axios.get<ApiResponse>(`https://api.artic.edu/api/v1/artworks`, {
          params: {
            page: pageToFetch,
            limit: params.rows,
          }
        });
        const rowsToSelect = response.data.data.slice(0, remainingCount);
        rowsToSelect.forEach(row => newSelectedIds.add(row.id));
        remainingCount -= rowsToSelect.length;
        if (remainingCount <= 0) break;
      } catch (error) {
        console.error('Error fetching data:', error);
        break;
      }
    }
    setSelectedDataIds(newSelectedIds);
    setLoading(false);
  };

  const handleSelectionChange = (event: DataTableSelectionEvent<FetchedData[]>) => {
    const newSelectedIds = new Set(selectedDataIds);
    
    data.forEach(row => {
      if (event.value.some(selected => selected.id === row.id)) {
        newSelectedIds.add(row.id);
      } else {
        newSelectedIds.delete(row.id);
      }
    });

    setSelectedDataIds(newSelectedIds);
  };

  const selectAllTemplate = () => {
    return (
      <div className="flex align-items-center">
        <Button
          icon="pi pi-chevron-down"
          onClick={(e) => op.current?.toggle(e)}
          className="p-button-text p-button-plain mr-2"
        />
        <OverlayPanel ref={op}>
          <div className="p-fluid">
            <InputNumber
              inputId="select-count-input"
              value={selectCount}
              onValueChange={(e) => setSelectCount(e.value)}
              placeholder="Enter number of rows"
              min={1}
            />
            <Button
              label="Select"
              className="mt-2"
              onClick={() => {
                if (selectCount) {
                  selectMultipleRows(selectCount);
                  op.current?.hide();
                }
              }}
            />
          </div>
        </OverlayPanel>
      </div>
    );
  };

  return (
    <div className="card">
      <DataTable
        value={data}
        lazy
        paginator
        first={params.rows * (params.page - 1)}
        rows={params.rows}
        totalRecords={totalRecords}
        onPage={onPage}
        loading={loading}
        selection={data.filter(row => selectedDataIds.has(row.id))}
        onSelectionChange={handleSelectionChange}
        dataKey="id"
        selectionMode="multiple"
        emptyMessage="No data found"
      >
        <Column 
          selectionMode="multiple" 
          headerStyle={{ width: '3rem' }} 
          header={selectAllTemplate} 
        />
        <Column field="title" header="Title" />
        <Column field="place_of_origin" header="Place of Origin" />
        <Column field="artist_display" header="Artist" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Start Date" />
        <Column field="date_end" header="End Date" />
      </DataTable>
    </div>
  );
};

export default ApiDataTable;

