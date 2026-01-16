import { Module } from '@nestjs/common';

import { MemoModule } from './memo/memo.module';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { ConfigModule } from '@nestjs/config';


console.info('---------------------------------------')
console.info(`Mysql host: ${process.env.DATABASE_HOST}`);
console.info('---------------------------------------')

@Module({
  imports: [

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '3306'),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Set to false in production
    }),
    MemoModule
  ],
})
export class AppModule {}
