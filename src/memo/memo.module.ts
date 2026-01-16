import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoController } from './memo.controller';
import { MemoService } from './memo.service';
import { Memo } from './entities/memo.entity';
import { MemoNode } from './entities/memo-node.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Memo, MemoNode]),
  ],
  controllers: [MemoController],
  providers: [MemoService],
  exports: [MemoService],
})
export class MemoModule {}
