export type ClientStatus = 'Active' | 'Draft';

export type ClientRow = {
  id: string;
  name: string;
  shortName: string;
  shortNameClasses: string;
  status: ClientStatus;
  updated: string;
  preview: string;
};
