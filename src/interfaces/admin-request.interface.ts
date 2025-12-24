import { Request } from 'express';

export interface IAdminRequestCustom extends Request {
  admin?: {
    _id: string;
  };
}
