// SC2 Protocol System
// Based on Blizzard's s2protocol implementation

import type z from "zod";

import type {
  ReplayHeader,
  ReplayDetails,
  ReplayInitData,
  GameEvent,
  MessageEvent,
  TrackerEvent,
  AttributeEvent,
} from "../types";
import type { ProtocolDecoder, SupportProtocolVersion, ZodTypeInfos } from "./types";
import protocol80949 from "./versions/protocol80949";
import buildZodTypeinfo from "./zod-typeinfo/index";

// Direct mapping from build versions to protocol decoders
// Protocol 80949 now supports bzip2 decompression and is compatible with builds 80949-94137
const BUILD_TO_PROTOCOL: Record<SupportProtocolVersion, ProtocolDecoder> = {
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

function numberIsBuildVersion(build: number): build is SupportProtocolVersion {
  return build in BUILD_TO_PROTOCOL;
}

/**
 * Get protocol decoder for a specific build version
 */
export function getProtocol(buildVersion: number): ProtocolDecoder {
  if (!numberIsBuildVersion(buildVersion)) {
    throw new Error(`Unsupported build version: ${buildVersion}`);
  }

  return BUILD_TO_PROTOCOL[buildVersion];
}

function getZodTypeInfo(build: SupportProtocolVersion): ZodTypeInfos {
  return buildZodTypeinfo[build];
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
  return numberIsBuildVersion(buildVersion);
}

/**
 * Get the latest/highest build version from BUILD_TO_PROTOCOL
 */
export function getLatestBuildVersion(): number {
  const buildVersions = Object.keys(BUILD_TO_PROTOCOL).map(Number).sort((a, b) => b - a);
  if (buildVersions[0] == null) {
    throw new Error("No supported build versions available");
  }
  return buildVersions[0];
}

/**
 * Converts Buffer to clean UTF-8 string by removing null bytes and trimming whitespace
 */
function bufferToString(buffer: Buffer): string {
  return buffer.toString("utf8").replace(/\0/g, "").trim();
}

export class VersionedProtocol {

  private protocol: ProtocolDecoder;
  private zodTypeInfo: ZodTypeInfos;

  constructor(buildVersion?: number) {
    const actualBuildVersion = buildVersion ?? getLatestBuildVersion();
    this.protocol = getProtocol(actualBuildVersion);
    this.zodTypeInfo = getZodTypeInfo(actualBuildVersion as SupportProtocolVersion);
  }
  decodeReplayHeader(data: Buffer): ReplayHeader {
    const rawReplayHeader = this.protocol.decodeReplayHeader(data);
    const parsedReplayHeader = this.zodTypeInfo.replayHeader.parse(rawReplayHeader);

    return {
      signature: parsedReplayHeader.m_signature.toString("utf8").replace(/\0/g, "").trim(),
      version: {
        flags: parsedReplayHeader.m_version.m_flags,
        major: parsedReplayHeader.m_version.m_major,
        minor: parsedReplayHeader.m_version.m_minor,
        revision: parsedReplayHeader.m_version.m_revision,
        build: parsedReplayHeader.m_version.m_build,
        baseBuild: parsedReplayHeader.m_version.m_baseBuild,
      },
      type: parsedReplayHeader.m_type,
      elapsedGameLoops: parsedReplayHeader.m_elapsedGameLoops,
      useScaledTime: parsedReplayHeader.m_useScaledTime,
      ngdpRootKey: {
        dataDeprecated: parsedReplayHeader.m_ngdpRootKey.m_dataDeprecated,
        data: parsedReplayHeader.m_ngdpRootKey.m_data,
      },
      dataBuildNum: parsedReplayHeader.m_dataBuildNum,
      replayCompatibilityHash: {
        dataDeprecated: parsedReplayHeader.m_replayCompatibilityHash.m_dataDeprecated,
        data: parsedReplayHeader.m_replayCompatibilityHash.m_data,
      },
      ngdpRootKeyIsDevData: {
        dataDeprecated: undefined,
        data: parsedReplayHeader.m_ngdpRootKeyIsDevData,
      },
      length: data.length,
    };
  }

  decodeReplayDetails(data: Buffer): ReplayDetails {
    const rawReplayDetails = this.protocol.decodeReplayDetails(data);

    // Transform raw data to match Zod schema expectations
    const transformedData = this.transformReplayDetailsForValidation(rawReplayDetails);
    type ReplayDetail = z.infer<typeof this.zodTypeInfo.replayDetails>;
    type Player = NonNullable<ReplayDetail["m_playerList"]>[number];
    type PlayerToon = Player["m_toon"];
    type PlayerColor = Player["m_color"];
    const parsedReplayDetails = this.zodTypeInfo.replayDetails.parse(transformedData);

    return {
      playerList: parsedReplayDetails.m_playerList?.map((player: Player, index: number) => {
        const playerToon = player["m_toon"] as PlayerToon;
        const playerColor = player["m_color"] as PlayerColor;
        return {
          name: bufferToString(player["m_name"]),
          toon: {
            region: playerToon["m_region"],
            programId: playerToon["m_programId"],
            realm: playerToon["m_realm"],
            name: playerToon["m_name"] ? bufferToString(playerToon["m_name"]) : "",
            id: playerToon["m_id"],
          },
          race: bufferToString(player["m_race"]),
          color: {
            a: playerColor["m_a"],
            r: playerColor["m_r"],
            g: playerColor["m_g"],
            b: playerColor["m_b"],
          },
          control: player["m_control"],
          teamId: player["m_teamId"],
          handicap: player["m_handicap"],
          observe: player["m_observe"],
          result: player["m_result"],
          workingSetSlotId: player["m_workingSetSlotId"],
          hero: bufferToString(player["m_hero"]),
          userId: index,
        };
      }),
      title: bufferToString(parsedReplayDetails.m_title),
      difficulty: bufferToString(parsedReplayDetails.m_difficulty),
      thumbnail: {
        file: bufferToString(parsedReplayDetails.m_thumbnail.m_file),
      },
      isBlizzardMap: parsedReplayDetails.m_isBlizzardMap,
      timeUTC: Number(parsedReplayDetails.m_timeUTC),
      timeLocalOffset: Number(parsedReplayDetails.m_timeLocalOffset),
      restartAsTransitionMap: parsedReplayDetails.m_restartAsTransitionMap,
      disableRecoverGame: parsedReplayDetails.m_disableRecoverGame,
      description: bufferToString(parsedReplayDetails.m_description),
      imageFilePath: bufferToString(parsedReplayDetails.m_imageFilePath),
      campaignIndex: parsedReplayDetails.m_campaignIndex,
      mapFileName: bufferToString(parsedReplayDetails.m_mapFileName),
      cacheHandles: parsedReplayDetails.m_cacheHandles?.map(bufferToString) ?? [],
      miniSave: parsedReplayDetails.m_miniSave,
      gameSpeed: parsedReplayDetails.m_gameSpeed,
      defaultDifficulty: parsedReplayDetails.m_defaultDifficulty,
      modPaths: parsedReplayDetails.m_modPaths?.map(bufferToString),
      type: 0, // Default value, not present in zod schema
      realTimeLength: 0, // Default value, not present in zod schema
      mapSizeX: 0, // Default value, not present in zod schema
      mapSizeY: 0, // Default value, not present in zod schema
    };
  }

  decodeReplayInitdata(data: Buffer): ReplayInitData {
    const rawReplayInitdata = this.protocol.decodeReplayInitdata(data);
    type ReplayInitdata = z.infer<typeof this.zodTypeInfo.replayInitdata>;
    type UserInitialData = ReplayInitdata["m_syncLobbyState"]["m_userInitialData"][number];
    type SlotDescription = ReplayInitdata["m_syncLobbyState"]["m_gameDescription"]["m_slotDescriptions"][number];
    type LobbySlot = ReplayInitdata["m_syncLobbyState"]["m_lobbyState"]["m_slots"][number];
    const parsedReplayInitdata: ReplayInitdata = this.zodTypeInfo.replayInitdata.parse(rawReplayInitdata);

    return {
      syncLobbyState: {
        userInitialData: parsedReplayInitdata.m_syncLobbyState.m_userInitialData.map((user: UserInitialData) => ({
          name: user.m_name,
          clanTag: user.m_clanTag,
          clanLogo: user.m_clanLogo,
          highestLeague: user.m_highestLeague,
          combinedRaceLevels: user.m_combinedRaceLevels,
          randomSeed: user.m_randomSeed,
          racePreference: {
            race: user.m_racePreference.m_race,
          },
          teamPreference: {
            team: user.m_teamPreference.m_team,
          },
          testMap: user.m_testMap,
          testAuto: user.m_testAuto,
          examine: user.m_examine,
          customInterface: user.m_customInterface,
          testType: user.m_testType,
          observe: user.m_observe,
          hero: user.m_hero,
          skin: user.m_skin,
          mount: user.m_mount,
          toonHandle: user.m_toonHandle,
          scaledRating: user.m_scaledRating,
        })),
        gameDescription: {
          randomValue: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_randomValue,
          gameCacheName: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameCacheName,
          gameOptions: {
            lockTeams: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_lockTeams,
            teamsTogether: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_teamsTogether,
            // eslint-disable-next-line max-len
            advancedSharedControl: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_advancedSharedControl,
            randomRaces: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_randomRaces,
            battleNet: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_battleNet,
            amm: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_amm,
            competitive: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_competitive,
            practice: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_practice,
            cooperative: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_cooperative,
            // eslint-disable-next-line max-len
            noVictoryOrDefeat: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_noVictoryOrDefeat,
            // eslint-disable-next-line max-len
            heroDuplicatesAllowed: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_heroDuplicatesAllowed,
            fog: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_fog,
            observers: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_observers,
            userDifficulty: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_userDifficulty,
            clientDebugFlags: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_clientDebugFlags,
            // eslint-disable-next-line max-len
            buildCoachEnabled: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameOptions.m_buildCoachEnabled,
          },
          gameSpeed: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameSpeed,
          gameType: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_gameType,
          maxUsers: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_maxUsers,
          maxObservers: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_maxObservers,
          maxPlayers: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_maxPlayers,
          maxTeams: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_maxTeams,
          maxColors: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_maxColors,
          maxRaces: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_maxRaces,
          maxControls: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_maxControls,
          mapSizeX: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_mapSizeX,
          mapSizeY: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_mapSizeY,
          mapFileSyncChecksum: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_mapFileSyncChecksum,
          mapFileName: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_mapFileName,
          mapAuthorName: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_mapAuthorName,
          modFileSyncChecksum: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_modFileSyncChecksum,
          slotDescriptions: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_slotDescriptions.map(
            (slot: SlotDescription) => ({
              allowedColors: slot.m_allowedColors,
              allowedRaces: slot.m_allowedRaces,
              allowedDifficulty: slot.m_allowedDifficulty,
              allowedControls: slot.m_allowedControls,
              allowedObserveTypes: slot.m_allowedObserveTypes,
              allowedAIBuilds: slot.m_allowedAIBuilds,
            }),
          ),
          defaultDifficulty: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_defaultDifficulty,
          defaultAIBuild: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_defaultAIBuild,
          cacheHandles: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_cacheHandles,
          hasExtensionMod: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_hasExtensionMod,
          // eslint-disable-next-line max-len
          hasNonBlizzardExtensionMod: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_hasNonBlizzardExtensionMod,
          isBlizzardMap: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_isBlizzardMap,
          isPremadeFFA: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_isPremadeFFA,
          isCoopMode: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_isCoopMode,
          isRealtimeMode: parsedReplayInitdata.m_syncLobbyState.m_gameDescription.m_isRealtimeMode,
        },
        lobbyState: {
          phase: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_phase,
          maxUsers: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_maxUsers,
          maxObservers: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_maxObservers,
          slots: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_slots.map((slot: LobbySlot) => ({
            control: slot.m_control,
            userId: slot.m_userId,
            teamId: slot.m_teamId,
            colorPref: {
              color: slot.m_colorPref.m_color,
            },
            racePref: {
              race: slot.m_racePref.m_race,
            },
            difficulty: slot.m_difficulty,
            aiBuild: slot.m_aiBuild,
            handicap: slot.m_handicap,
            observe: slot.m_observe,
            logoIndex: slot.m_logoIndex,
            hero: slot.m_hero,
            skin: slot.m_skin,
            mount: slot.m_mount,
            artifacts: slot.m_artifacts,
            workingSetSlotId: slot.m_workingSetSlotId,
            rewards: slot.m_rewards,
            toonHandle: slot.m_toonHandle,
            licenses: slot.m_licenses,
            tandemLeaderId: slot.m_tandemLeaderId,
            commander: slot.m_commander,
            commanderLevel: slot.m_commanderLevel,
            hasSilencePenalty: slot.m_hasSilencePenalty,
            tandemId: slot.m_tandemId,
            commanderMasteryLevel: slot.m_commanderMasteryLevel,
            commanderMasteryTalents: slot.m_commanderMasteryTalents,
            trophyId: slot.m_trophyId,
            rewardOverrides: slot.m_rewardOverrides.map((override: ReplayInitdata["m_syncLobbyState"]["m_slots"]["m_slots"][number]["m_rewardOverrides"][number]) => ({
              key: override.m_key,
              rewards: override.m_rewards,
            })),
            brutalPlusDifficulty: slot.m_brutalPlusDifficulty,
            retryMutationIndexes: slot.m_retryMutationIndexes,
            aCEnemyRace: slot.m_aCEnemyRace,
            aCEnemyWaveType: slot.m_aCEnemyWaveType,
            selectedCommanderPrestige: slot.m_selectedCommanderPrestige,
          })),
          randomSeed: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_randomSeed,
          hostUserId: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_hostUserId,
          isSinglePlayer: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_isSinglePlayer,
          pickedMapTag: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_pickedMapTag,
          gameDuration: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_gameDuration,
          defaultDifficulty: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_defaultDifficulty,
          defaultAIBuild: parsedReplayInitdata.m_syncLobbyState.m_lobbyState.m_defaultAIBuild,
        },
      },
    };
  }

  decodeReplayGameEvents(data: Buffer): GameEvent[] {
    const rawGameEvents = this.protocol.decodeReplayGameEvents(data);
    type ReplayEventsType = z.infer<typeof this.zodTypeInfo.replayGameEvents>;
    const parsedGameEvents: ReplayEventsType = this.zodTypeInfo.replayGameEvents.parse(rawGameEvents);

    return parsedGameEvents.map((event: ReplayEventsType[number]) => ({
      ...event,
      loop: event._gameloop,
      userId: event._userid,
      eventType: event._event,
      eventData: event,
    }));
  }

  decodeReplayMessageEvents(data: Buffer): MessageEvent[] {
    const rawMessageEvents = this.protocol.decodeReplayMessageEvents(data);
    type MessageEventsType = z.infer<typeof this.zodTypeInfo.replayMessageEvents>;
    const parsedMessageEvents: MessageEventsType = this.zodTypeInfo.replayMessageEvents.parse(rawMessageEvents);

    return parsedMessageEvents.map((event: MessageEventsType[number]) => ({
      ...event,
      loop: event._gameloop,
      userId: event._userid,
      messageType: event._event,
      messageData: event,
    }));
  }

  decodeReplayTrackerEvents(data: Buffer): TrackerEvent[] {
    const rawTrackerEvents = this.protocol.decodeReplayTrackerEvents?.(data) ?? [];
    type TrackerEventsType = z.infer<typeof this.zodTypeInfo.replayTrackerEvents>;
    const parsedTrackerEvents: TrackerEventsType = this.zodTypeInfo.replayTrackerEvents.parse(rawTrackerEvents);

    return parsedTrackerEvents.map((event: TrackerEventsType[number]) => ({
      ...event,
      loop: event._gameloop,
      eventType: event._event,
    }));
  }

  decodeReplayAttributesEvents(data: Buffer): AttributeEvent {
    const rawAttributesEvents = this.protocol.decodeReplayAttributesEvents(data);
    const parsedAttributesEvents = this.zodTypeInfo.replayAttributesEvents.parse(rawAttributesEvents);

    // AttributesEvents is typically a single event or an array with one element
    const event = Array.isArray(parsedAttributesEvents) ? parsedAttributesEvents[0] : parsedAttributesEvents;

    return {
      ...event,
      loop: event._gameloop,
      attributeData: event,
    };
  }

  /**
   * Transform raw replay details data to match Zod schema expectations
   * Only converts numbers to bigints where needed - Buffer fields are kept as-is
   */
  private transformReplayDetailsForValidation(rawData: unknown): unknown {
    if (!rawData || typeof rawData !== "object") {
      return rawData;
    }

    const transformed = { ...rawData } as Record<string, unknown>;

    // Transform player list
    if (transformed["m_playerList"] && Array.isArray(transformed["m_playerList"])) {
      transformed["m_playerList"] = transformed["m_playerList"].map((player: Record<string, unknown>) => {
        const playerToon = player["m_toon"] as Record<string, unknown> | undefined;
        return {
          ...player,
          // Transform toon object
          m_toon: playerToon ? {
            ...playerToon,
            // Convert number to bigint for m_id
            m_id: typeof playerToon["m_id"] === "number"
              ? BigInt(playerToon["m_id"] as number)
              : playerToon["m_id"],
          } : playerToon,
        };
      });
    }

    // Convert numbers to bigints for time fields
    if (typeof transformed["m_timeUTC"] === "number") {
      transformed["m_timeUTC"] = BigInt(transformed["m_timeUTC"] as number);
    }
    if (typeof transformed["m_timeLocalOffset"] === "number") {
      transformed["m_timeLocalOffset"] = BigInt(transformed["m_timeLocalOffset"] as number);
    }

    // Handle null modPaths (convert to undefined for optional array)
    if (transformed["m_modPaths"] === null) {
      transformed["m_modPaths"] = undefined;
    }

    return transformed;
  }
}
