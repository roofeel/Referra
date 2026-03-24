export type ClientStatus = 'Active' | 'Draft';

export type ClientRow = {
  id: string;
  clientName: string;
  ruleName: string;
  shortName: string;
  shortNameClasses: string;
  status: ClientStatus;
  updated: string;
  preview: string;
};
