import type { Request, Response } from 'express';

import { HTTP_STATUS_OK } from '../../constants/http.constants';
import {
  externalGetMedicineInfo,
  externalGetMedicineInfoByCn,
  externalSearchMedicines,
} from './external.service';

export const externalNationalCodeController = async (request: Request, response: Response): Promise<void> => {
  const result = await externalGetMedicineInfoByCn(request.params.cn as string);
  response.status(HTTP_STATUS_OK).json({ success: true, data: result });
};

/**
 * Returns CIMA search matches for a medicine name query.
 */
export const externalSearchController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const result = await externalSearchMedicines(request.query.q as string);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Returns the full CIMA record for a medicine registry id.
 */
export const externalInfoController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const result = await externalGetMedicineInfo(request.params.nregist as string);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};
