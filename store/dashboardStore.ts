import { create } from "zustand";

interface DashboardState {
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  slaFocusedTaskId: string | null;
  setSlaFocusedTaskId: (id: string | null) => void;
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  taskStatusFilter: string;
  setTaskStatusFilter: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activityLimit: number;
  setActivityLimit: (limit: number) => void;
    showArchived: boolean;
    setShowArchived: (v: boolean) => void;
  clearFilters: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  slaFocusedTaskId: null,
  setSlaFocusedTaskId: (id) => set({ slaFocusedTaskId: id }),
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  taskStatusFilter: "ALL",
  setTaskStatusFilter: (status) => set({ taskStatusFilter: status }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  activityLimit: 50,
  setActivityLimit: (limit) => set({ activityLimit: limit }),
    showArchived: false,
    setShowArchived: (v) => set({ showArchived: v }),
  clearFilters: () =>
    set({
      selectedAgentId: null,
      taskStatusFilter: "ALL",
      searchQuery: "",
      activityLimit: 50,
      slaFocusedTaskId: null,
        showArchived: false,
    }),
}));
