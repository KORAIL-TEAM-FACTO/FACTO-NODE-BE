import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { CallsModule } from './modules/calls/Calls.module';
import { WelfareServicesModule } from './modules/welfare-services/WelfareServices.module';
import { LoggerService } from './infrastructure/logging/logger.service';

/**
 * Root Application Module
 * DDD 기반 아키텍처로 구성
 */
@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // TypeORM Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = {
          type: 'mysql' as const,
          host: configService.get<string>('DB_HOST'),
          port: parseInt(configService.get<string>('DB_PORT', '3306'), 10),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: true, // Enable full logging
          logger: 'advanced-console' as const,
          connectTimeout: 10000, // 10초로 줄임
          acquireTimeout: 10000,
          timeout: 10000,
          extra: {
            connectionLimit: 5,
            connectTimeout: 10000,
            waitForConnections: true,
            queueLimit: 0,
          },
        };

        console.log('[TypeORM] Attempting to connect with config:', {
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          database: dbConfig.database,
        });

        return dbConfig;
      },
    }),
    // Domain Modules
    UsersModule,
    HealthModule,
    CallsModule,
    WelfareServicesModule,
  ],
  providers: [LoggerService],
})
export class AppModule {}
