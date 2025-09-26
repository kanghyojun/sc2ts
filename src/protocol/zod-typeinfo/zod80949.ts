import * as z from 'zod';

import type { ZodTypeInfos } from '../types';

// Basic type schemas (typeids 0, 1, 2)
export const PIntTypeInfo = z.number(); // typeid 0: 7-bit integer
export const PInt4TypeInfo = z.number(); // typeid 1: 4-bit integer
export const PInt5TypeInfo = z.number(); // typeid 2: 5-bit integer

export const PBigIntTypeInfo = z.bigint();
export const PDataTypeInfo = z.object({
  m_dataDeprecated: z.number().optional(),
  m_data: z.instanceof(Buffer),
});

// Buffer schema for blob types
const bufferSchema = z.instanceof(Buffer);

// Player info schemas
export const PToon = z.object({
  m_region: z.number(),
  m_programId: z.string(), // fourcc type
  m_realm: z.number(),
  m_name: bufferSchema.optional(), // Can be missing in actual data even though protocol defines it as required
  m_id: z.bigint(),
});

export const PColor = z.object({
  m_a: z.number(),
  m_r: z.number(),
  m_g: z.number(),
  m_b: z.number(),
});

export const PPlayerInfo = z.object({
  m_name: bufferSchema,
  m_toon: PToon,
  m_race: bufferSchema,
  m_color: PColor,
  m_control: z.number(),
  m_teamId: z.number(),
  m_handicap: z.number(),
  m_observe: z.number(),
  m_result: z.number(),
  m_workingSetSlotId: z.number().optional(),
  m_hero: bufferSchema,
});

// Game details schema (typeid 40)
export const PGameDetails = z.object({
  m_playerList: z.array(PPlayerInfo).optional(),
  m_title: bufferSchema,
  m_difficulty: bufferSchema,
  m_thumbnail: z.object({
    m_file: bufferSchema,
  }),
  m_isBlizzardMap: z.boolean(),
  m_timeUTC: z.bigint(),
  m_timeLocalOffset: z.bigint(),
  m_restartAsTransitionMap: z.boolean().optional(),
  m_disableRecoverGame: z.boolean(),
  m_description: bufferSchema,
  m_imageFilePath: bufferSchema,
  m_campaignIndex: z.number(),
  m_mapFileName: bufferSchema,
  m_cacheHandles: z.array(bufferSchema).optional(),
  m_miniSave: z.boolean(),
  m_gameSpeed: z.number(),
  m_defaultDifficulty: z.number(),
  m_modPaths: z.array(bufferSchema).optional(),
});

// Init data schema (typeid 73)
export const PReplayInitData = z.object({
  m_syncLobbyState: z.object({
    m_userInitialData: z.array(z.object({
      m_name: z.string(),
      m_clanTag: z.string().optional(),
      m_clanLogo: z.string().optional(),
      m_highestLeague: z.number().optional(),
      m_combinedRaceLevels: z.number().optional(),
      m_randomSeed: z.number(),
      m_racePreference: z.object({
        m_race: z.number().optional(),
      }),
      m_teamPreference: z.object({
        m_team: z.number().optional(),
      }),
      m_testMap: z.boolean(),
      m_testAuto: z.boolean(),
      m_examine: z.boolean(),
      m_customInterface: z.boolean(),
      m_testType: z.number(),
      m_observe: z.number(),
      m_hero: z.string(),
      m_skin: z.string(),
      m_mount: z.string(),
      m_toonHandle: z.string(),
      m_scaledRating: z.number().optional(),
    })),
    m_gameDescription: z.object({
      m_randomValue: z.number(),
      m_gameCacheName: z.string(),
      m_gameOptions: z.object({
        m_lockTeams: z.boolean(),
        m_teamsTogether: z.boolean(),
        m_advancedSharedControl: z.boolean(),
        m_randomRaces: z.boolean(),
        m_battleNet: z.boolean(),
        m_amm: z.boolean(),
        m_competitive: z.boolean(),
        m_practice: z.boolean(),
        m_cooperative: z.boolean(),
        m_noVictoryOrDefeat: z.boolean(),
        m_heroDuplicatesAllowed: z.boolean(),
        m_fog: z.number(),
        m_observers: z.number(),
        m_userDifficulty: z.number(),
        m_clientDebugFlags: z.bigint(),
        m_buildCoachEnabled: z.boolean(),
      }),
      m_gameSpeed: z.number(),
      m_gameType: z.number(),
      m_maxUsers: z.number(),
      m_maxObservers: z.number(),
      m_maxPlayers: z.number(),
      m_maxTeams: z.number(),
      m_maxColors: z.number(),
      m_maxRaces: z.number(),
      m_maxControls: z.number(),
      m_mapSizeX: z.number(),
      m_mapSizeY: z.number(),
      m_mapFileSyncChecksum: z.number(),
      m_mapFileName: z.string(),
      m_mapAuthorName: z.string(),
      m_modFileSyncChecksum: z.number(),
      m_slotDescriptions: z.array(z.object({
        m_allowedColors: z.instanceof(Buffer),
        m_allowedRaces: z.instanceof(Buffer),
        m_allowedDifficulty: z.instanceof(Buffer),
        m_allowedControls: z.instanceof(Buffer),
        m_allowedObserveTypes: z.instanceof(Buffer),
        m_allowedAIBuilds: z.instanceof(Buffer),
      })),
      m_defaultDifficulty: z.number(),
      m_defaultAIBuild: z.number(),
      m_cacheHandles: z.array(z.string()),
      m_hasExtensionMod: z.boolean(),
      m_hasNonBlizzardExtensionMod: z.boolean(),
      m_isBlizzardMap: z.boolean(),
      m_isPremadeFFA: z.boolean(),
      m_isCoopMode: z.boolean(),
      m_isRealtimeMode: z.boolean(),
    }),
    m_lobbyState: z.object({
      m_phase: z.number(),
      m_maxUsers: z.number(),
      m_maxObservers: z.number(),
      m_slots: z.array(z.object({
        m_control: z.number(),
        m_userId: z.number().optional(),
        m_teamId: z.number(),
        m_colorPref: z.object({
          m_color: z.number().optional(),
        }),
        m_racePref: z.object({
          m_race: z.number().optional(),
        }),
        m_difficulty: z.number(),
        m_aiBuild: z.number(),
        m_handicap: z.number(),
        m_observe: z.number(),
        m_logoIndex: z.number(),
        m_hero: z.string(),
        m_skin: z.string(),
        m_mount: z.string(),
        m_artifacts: z.array(z.string()),
        m_workingSetSlotId: z.number().optional(),
        m_rewards: z.array(z.number()),
        m_toonHandle: z.string(),
        m_licenses: z.array(z.number()),
        m_tandemLeaderId: z.number().optional(),
        m_commander: z.string(),
        m_commanderLevel: z.number(),
        m_hasSilencePenalty: z.boolean(),
        m_tandemId: z.number().optional(),
        m_commanderMasteryLevel: z.number(),
        m_commanderMasteryTalents: z.array(z.number()),
        m_trophyId: z.number(),
        m_rewardOverrides: z.array(z.object({
          m_key: z.number(),
          m_rewards: z.array(z.number()),
        })),
        m_brutalPlusDifficulty: z.number(),
        m_retryMutationIndexes: z.array(z.number()),
        m_aCEnemyRace: z.number(),
        m_aCEnemyWaveType: z.number(),
        m_selectedCommanderPrestige: z.number(),
      })),
      m_randomSeed: z.number(),
      m_hostUserId: z.number().optional(),
      m_isSinglePlayer: z.boolean(),
      m_pickedMapTag: z.number(),
      m_gameDuration: z.number(),
      m_defaultDifficulty: z.number(),
      m_defaultAIBuild: z.number(),
    }),
  }),
});

// Choice type schema (typeid 7)
export const PSvarUint32 = z.union([
  z.object({ m_uint6: z.number() }),
  z.object({ m_uint14: z.number() }),
  z.object({ m_uint22: z.number() }),
  z.object({ m_uint32: z.number() }),
]);

// User ID schema (typeid 8)
export const PReplayUserId = z.object({
  m_userId: z.number(),
});

export const PReplayHeader = z.object({
  m_signature: z.instanceof(Buffer),
  m_version: z.object({
    m_flags: z.number(),
    m_major: z.number(),
    m_minor: z.number(),
    m_revision: z.number(),
    m_build: z.number(),
    m_baseBuild: z.number(),
  }),
  m_type: z.number(),
  m_elapsedGameLoops: z.number(),
  m_useScaledTime: z.boolean(),
  m_ngdpRootKey: PDataTypeInfo,
  m_dataBuildNum: z.number(),
  m_replayCompatibilityHash: PDataTypeInfo,
  m_ngdpRootKeyIsDevData: z.boolean(),
});

export type ParsedReplayHeader = z.infer<typeof PReplayHeader>;

export const PEvent = z.object({
  _event: z.string(),
  _eventid: z.number(),
  _gameloop: z.number(),
  _userid: z.number().optional(),
  _bits: z.number(),
});


export default {
  replayHeader: PReplayHeader,
  replayDetails: PGameDetails,
  replayInitdata: PReplayInitData,
  replayGameEvents: z.array(PEvent),
  replayMessageEvents: z.array(PEvent),
  replayTrackerEvents: z.array(PEvent),
  replayAttributesEvents: z.array(PEvent),
} as ZodTypeInfos;
