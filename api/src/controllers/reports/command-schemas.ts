import { z } from 'zod';

export const createReportBodySchema = z
  .object({
    taskName: z.string().optional(),
    client: z.string().optional(),
    source: z.string().optional(),
    sourceIcon: z.string().optional(),
    reportType: z.unknown().optional(),
    attributionLogic: z.unknown().optional(),
    fieldMappings: z.record(z.string(), z.string()).optional(),
    fileName: z.string().optional(),
    fileContent: z.string().optional(),
    ruleId: z.string().optional(),
    journeyConfig: z.unknown().optional(),
  })
  .strict();

export const attachRelatedEventsBodySchema = z
  .object({
    fileContent: z.string().optional(),
    idField: z.string().optional(),
    timeField: z.string().optional(),
    eventField: z.string().optional(),
    eventUrlField: z.string().optional(),
  })
  .strict();

export const updateStatusBodySchema = z
  .object({
    status: z.string().optional(),
    progress: z.number().finite().optional(),
  })
  .strict();
