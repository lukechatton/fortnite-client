import { classToPlain, plainToClass, Type } from 'class-transformer';
import { StatsItem } from './stats-item';

export class PlayerStats {
  @Type(() => StatsItem)
  public stats: StatsItem[];

  public static FROM_JSON(jsonObject: {}): PlayerStats {
    return plainToClass(PlayerStats, jsonObject);
  }

  /* istanbul ignore next */
  public toJson(): {} {
    return classToPlain(this);
  }
}

export interface IPlayerStats {
  stats: {}[];
}
