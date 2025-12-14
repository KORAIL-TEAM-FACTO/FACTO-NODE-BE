import { ApiProperty } from '@nestjs/swagger';

/**
 * WebRTC Configuration Response DTO
 *
 * @description 클라이언트에게 제공할 WebRTC 설정
 */
export class WebRTCConfigResponseDto {
  @ApiProperty({
    description: 'ICE 서버 목록 (STUN)',
    example: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  })
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;

  @ApiProperty({
    description: 'ICE Candidate Pool 크기',
    example: 10,
  })
  iceCandidatePoolSize: number;

  @ApiProperty({
    description: 'ICE Transport Policy',
    example: 'all',
  })
  iceTransportPolicy: string;

  @ApiProperty({
    description: 'Bundle Policy',
    example: 'max-bundle',
  })
  bundlePolicy: string;

  @ApiProperty({
    description: 'RTCP Mux Policy',
    example: 'require',
  })
  rtcpMuxPolicy: string;
}
