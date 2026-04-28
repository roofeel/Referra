import { z } from 'zod';

export const createNonAttributedReportBodySchema = z
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
    attributedReportId: z.string().optional(),
    uidParamName: z.string().optional(),
  })
  .strict();

export const updateStatusBodySchema = z
  .object({
    status: z.string().optional(),
    progress: z.number().finite().optional(),
  })
  .strict();
