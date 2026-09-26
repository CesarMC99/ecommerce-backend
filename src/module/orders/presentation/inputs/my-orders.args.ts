import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_ORDERS_PAGE_SIZE } from '../../application/use-cases/list-my-orders.use-case';

@ArgsType()
export class MyOrdersArgs {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  @IsInt()
  @Min(1)
  @Max(MAX_ORDERS_PAGE_SIZE)
  pageSize: number = 10;
}
