import { classToPlain, plainToClass } from 'class-transformer';

export class Price {
  public currencyType: CurrencyType;
  public currencySubType: string;
  public regularPrice: number;
  public finalPrice: number;
  public saleExpiration: string;
  public basePrice: number;
  public saleType?: string;

  /* istanbul ignore next */
  public static FROM_JSON(jsonObject: {}): Price {
    return plainToClass(Price, jsonObject);
  }

  /* istanbul ignore next */
  public toJson(): {} {
    return classToPlain(this);
  }
}

export enum CurrencyType {
  GameItem = 'GameItem',
  MtxCurrency = 'MtxCurrency',
  RealMoney = 'RealMoney'
}
