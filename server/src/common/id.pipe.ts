import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
@Injectable()
export class IdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n)
      throw new BadRequestException('올바른 ID가 아닙니다.');
    return value;
  }
}
