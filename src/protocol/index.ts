// SC2 Protocol System
// Based on Blizzard's s2protocol implementation

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ProtocolDecoder, SC2ReplayHeaderDecoded } from './types';
import protocol80949 from './versions/protocol80949';

// Direct mapping from build versions to protocol decoders
// Protocol 80949 is compatible with builds 80949-94137
const BUILD_TO_PROTOCOL: Record<number, ProtocolDecoder> = {
  80949: protocol80949,
  81009: protocol80949,
  81102: protocol80949,
  81433: protocol80949,
  82457: protocol80949,
  83830: protocol80949,
  84643: protocol80949,
  88500: protocol80949,
  88661: protocol80949,
  90136: protocol80949,
  92440: protocol80949,
  93333: protocol80949,
  94137: protocol80949,
};

/**
 * Get protocol decoder for a specific build version
 */
export function getProtocol(buildVersion: number): ProtocolDecoder {
  const protocol = BUILD_TO_PROTOCOL[buildVersion] || getClosestProtocol(buildVersion);

  if (!protocol) {
    throw new Error(`Unsupported build version: ${buildVersion}`);
  }

  return protocol;
}

/**
 * Find the closest available protocol for unsupported build versions
 */
function getClosestProtocol(buildVersion: number): ProtocolDecoder | null {
  const availableVersions = Object.keys(BUILD_TO_PROTOCOL).map(Number).sort((a, b) => a - b);

  // Find the highest version that's still lower than or equal to the target
  for (let i = availableVersions.length - 1; i >= 0; i--) {
    const version = availableVersions[i];
    if (version && version <= buildVersion) {
      const protocol = BUILD_TO_PROTOCOL[version];
      if (protocol !== undefined) {
        return protocol;
      }
    }
  }

  // If no lower version found, use the lowest available
  const firstVersion = availableVersions[0];
  if (firstVersion !== undefined) {
    const protocol = BUILD_TO_PROTOCOL[firstVersion];
    if (protocol !== undefined) {
      return protocol;
    }
  }

  // Ultimate fallback
  return protocol80949;
}

/**
 * Get list of all supported build versions
 */
export function getSupportedBuilds(): number[] {
  return Object.keys(BUILD_TO_PROTOCOL).map(Number).sort((a, b) => a - b);
}

/**
 * Check if a build version is supported
 */
export function isBuildSupported(buildVersion: number): boolean {
  return buildVersion in BUILD_TO_PROTOCOL || getClosestProtocol(buildVersion) !== null;
}

/**
 * Get the latest/highest build version from BUILD_TO_PROTOCOL
 */
function getLatestBuildVersion(): number {
  const buildVersions = Object.keys(BUILD_TO_PROTOCOL).map(Number).sort((a, b) => b - a);
  return buildVersions[0] || 80949; // fallback to 80949 if no versions found
}

export function decodeReplayHeader(
  headerData: Buffer,
  buildVersion?: number,
): { baseBuild: number; version: SC2ReplayHeaderDecoded['version'] } {
  const protocol = getProtocol(buildVersion || getLatestBuildVersion());
  const targetBuildVersion = buildVersion || getLatestBuildVersion();
  const decodedHeader = protocol.decodeReplayHeader(headerData);
  if (decodedHeader.m_version === undefined) {
    throw new Error('Failed to decode replay header: version info missing');
  }
  const version = decodedHeader?.m_version || {};

  return {
    baseBuild: version.m_baseBuild || targetBuildVersion,
    version: {
      major: version.m_major || 2,
      minor: version.m_minor || 0,
      revision: version.m_revision || 0,
      build: version.m_build || targetBuildVersion,
      baseBuild: version.m_baseBuild || targetBuildVersion,
    },
  };
}

export function decodeReplayHeaderAsync(
  headerData: Buffer,
  buildVersion?: number,
): { baseBuild: number; version: SC2ReplayHeaderDecoded['version'] } {
  return decodeReplayHeader(headerData, buildVersion);
}

// Expose all ProtocolDecoder functions with build version support

export function decodeReplayDetails(data: Buffer, buildVersion?: number): any {
  return getProtocol(buildVersion || getLatestBuildVersion()).decodeReplayDetails(data);
}

export function decodeReplayInitdata(data: Buffer, buildVersion?: number): any {
  return getProtocol(buildVersion || getLatestBuildVersion()).decodeReplayInitdata(data);
}

export function decodeReplayGameEvents(data: Buffer, buildVersion?: number): any[] {
  return getProtocol(buildVersion || getLatestBuildVersion()).decodeReplayGameEvents(data);
}

export function decodeReplayMessageEvents(data: Buffer, buildVersion?: number): any[] {
  return getProtocol(buildVersion || getLatestBuildVersion()).decodeReplayMessageEvents(data);
}

export function decodeReplayTrackerEvents(data: Buffer, buildVersion?: number): any[] {
  const protocol = getProtocol(buildVersion || getLatestBuildVersion());
  return protocol.decodeReplayTrackerEvents?.(data) || [];
}

export function decodeReplayAttributesEvents(data: Buffer, buildVersion?: number): any {
  return getProtocol(buildVersion || getLatestBuildVersion()).decodeReplayAttributesEvents(data);
}
