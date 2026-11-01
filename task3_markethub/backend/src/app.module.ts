import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AuthGuard } from './auth';
import { Cache, Db } from './services';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '7d' } })],
  controllers: [AppController],
  providers: [Db, Cache, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
