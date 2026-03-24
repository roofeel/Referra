export type ClientStatus = 'Active' | 'Draft';

export type ClientRow = {
  name: string;
  shortName: string;
  shortNameClasses: string;
  status: ClientStatus;
  updated: string;
  preview: string;
  selected?: boolean;
};

export const clientRows: ClientRow[] = [
  {
    name: 'AstraZeneca Global',
    shortName: 'AZ',
    shortNameClasses: 'bg-blue-700/10 text-blue-700',
    status: 'Active',
    updated: '2h ago by Vane, A.',
    preview: 'async function categorizeFunnel(ourl) { const url = new URL(ourl); ...',
    selected: true,
  },
  {
    name: 'New York Times',
    shortName: 'NY',
    shortNameClasses: 'bg-slate-100 text-slate-500',
    status: 'Active',
    updated: '1d ago by System',
    preview: 'async function categorizeFunnel(ourl) { const params = new URLSearchParams(ourl)...',
  },
  {
    name: 'Veracity Solutions',
    shortName: 'VS',
    shortNameClasses: 'bg-slate-100 text-slate-500',
    status: 'Draft',
    updated: 'Just now by You',
    preview: 'async function categorizeFunnel(ourl) { // New logic for v4...',
  },
];
