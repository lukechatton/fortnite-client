import { classToPlain, plainToClass } from 'class-transformer';

export class Message {
  public image?: string;
  public hidden?: boolean;
  public title: string;
  public body: string;
  public messagetype?: MessageType;

  /* istanbul ignore next */
  public static FROM_JSON(jsonObject: {}): Message {
    return plainToClass(Message, jsonObject);
  }

  /* istanbul ignore next */
  public toJson(): {} {
    return classToPlain(this);
  }
}

export enum MessageType {
  CommonUISimpleMessageBase = 'CommonUI Simple Message Base'
}
