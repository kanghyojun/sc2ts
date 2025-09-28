// MPQ Archive Type Definitions

export interface MpqUserData {
  magic: number; // 'MPQ\x1B' (0x1B51504D)
  userDataSize: number; // Maximum size of the user data
  mpqHeaderOffset: number; // Offset to the MPQ header from start of file
  userDataHeaderSize: number; // Size of this header
}

export interface MpqHeader {
  magic: number;
  headerSize: number;
  archiveSize: number;
  formatVersion: number;
  blockSize: number;
  hashTablePos: number;
  blockTablePos: number;
  hashTableSize: number;
  blockTableSize: number;
  // Extended header fields for format version 2+
  hiBlockTablePos64?: bigint;
  hashTablePosHi?: number;
  blockTablePosHi?: number;
  // Extended header fields for format version 3+ (208-byte header)
  hetTablePos64?: bigint;
  betTablePos64?: bigint;
  hetTableSize64?: bigint;
  betTableSize64?: bigint;
  rawChunkSize?: number;
  blockTableArrayHash?: Buffer;
  hashTableArrayHash?: Buffer;
  betTableArrayHash?: Buffer;
  hetTableArrayHash?: Buffer;
  compressionLevel?: number;
}

export interface MpqHashTableEntry {
  name1: number;
  name2: number;
  locale: number;
  platform: number;
  blockIndex: number;
}

export interface MpqBlockTableEntry {
  filePos: number;
  compressedSize: number;
  fileSize: number;
  flags: number;
}

// HET/BET Table types for format version 3+
export interface HetTableHeader {
  signature: number; // 'HET\x1A'
  version: number;
  dataSize: number;
  tableSize: number;
  maxFileCount: number;
  hashTableSize: number;
  hashEntrySize: number;
  totalIndexSize: number;
  indexSizeExtra: number;
  indexSize: number;
  blockTableSize: number;
}

export interface BetTableHeader {
  signature: number; // 'BET\x1A'
  version: number;
  dataSize: number;
  tableSize: number;
  fileCount: number;
  unknown: number;
  tableEntrySize: number;
  bitIndexFilePos: number;
  bitIndexFileSize: number;
  bitIndexCmpSize: number;
  bitIndexFlagIndex: number;
  bitIndexNameHash2: number;
  bitCountFilePos: number;
  bitCountFileSize: number;
  bitCountCmpSize: number;
  bitCountFlagIndex: number;
  bitCountNameHash2: number;
  totalBetHashSize: number;
  betHashSizeExtra: number;
  betHashSize: number;
  betHashArraySize: number;
  flagCount: number;
}

export interface MpqFile {
  filename?: string;
  data: Buffer;
  compressedSize: number;
  fileSize: number;
  flags: number;
}

export interface MpqParseOptions {
  // Whether to decrypt protected files
  decrypt?: boolean;
  // Whether to decompress compressed files
  decompress?: boolean;
  // Whether to verify checksums
  verifyChecksums?: boolean;
  // List file content for resolving filenames
  listFile?: string;
}

export enum MpqFileFlags {
  COMPRESSED = 0x00000200,
  ENCRYPTED = 0x00010000,
  SINGLE_UNIT = 0x01000000,
  DELETE_MARKER = 0x02000000,
  SECTOR_CRC = 0x04000000,
  EXISTS = 0x80000000
}

export enum MpqCompression {
  HUFFMAN = 0x01,
  ZLIB = 0x02,
  PKWARE = 0x08,
  BZIP2 = 0x10,
  SPARSE = 0x20,
  ADPCM_MONO = 0x40,
  ADPCM_STEREO = 0x80,
  LZMA = 0x12
}

export interface DataStruct {
  dataDeprecated?: number | undefined;
  data: Buffer;
}

export interface ReplayHeader {
  signature: string;
  version: {
    flags: number;
    major: number;
    minor: number;
    revision: number;
    build: number;
    baseBuild: number;
  };
  type: number;
  elapsedGameLoops: number;
  useScaledTime: boolean;
  ngdpRootKey: DataStruct;
  dataBuildNum: number;// 6
  replayCompatibilityHash: DataStruct;
  ngdpRootKeyIsDevData: DataStruct;
  length: number;
}


export interface ReplayDetails {
  playerList?: Player[];
  title: string;
  difficulty: string;
  thumbnail: {
    file: string;
  };
  isBlizzardMap: boolean;
  timeUTC: number;
  timeLocalOffset: number;
  restartAsTransitionMap?: boolean;
  disableRecoverGame?: boolean;
  description: string;
  imageFilePath: string;
  campaignIndex: number;
  mapFileName: string;
  cacheHandles: string[];
  miniSave: boolean;
  gameSpeed: number;
  defaultDifficulty: number;
  modPaths?: string[];
  type: number;
  realTimeLength: number;
  mapSizeX: number;
  mapSizeY: number;
}

export interface Toon {
  region: number;
  programId: string;
  realm: number;
  name: string;
  id: bigint;
}

export interface Color {
  a: number;
  r: number;
  g: number;
  b: number;
}

export interface Player {
  name: string;
  toon: Toon;
  race: string;
  color: Color;
  control: number;
  teamId: number;
  handicap: number;
  observe: number;
  result: number;
  workingSetSlotId?: number;
  hero: string;
  userId: number;
}

export interface BaseEvent {
  _event: string;
  _eventid: number;
  _gameloop: number;
  _userid?: number;
  _bits: number;
}

export interface GameEvent extends BaseEvent {
  loop: number;
  userId?: number;
  eventType: string;
  eventData: unknown;
}

export interface MessageEvent extends BaseEvent {
  loop: number;
  userId?: number;
  messageType: string;
  messageData: unknown;
}

export interface TrackerEvent extends BaseEvent {
  loop: number;
  eventType: string;
  // Allow any additional fields from the decoded event structure
  [key: string]: unknown;
}

// Specific tracker event types for better typing
export interface SUnitBornEvent extends TrackerEvent {
  m_unitTagIndex?: number;
  m_unitTagRecycle?: number;
  m_unitTypeName?: string;
  m_controlPlayerId?: number;
  m_upkeepPlayerId?: number;
  m_x?: number;
  m_y?: number;
  m_creatorUnitTagIndex?: number;
  m_creatorUnitTagRecycle?: number;
  m_creatorAbilityName?: string;
}

export interface SUpgradeEvent extends TrackerEvent {
  m_playerId?: number;
  m_upgradeTypeName?: string;
  m_count?: number;
}

export interface SPlayerSetupEvent extends TrackerEvent {
  m_playerId?: number;
  m_type?: number;
  m_userId?: number;
  m_slotId?: number;
}

export interface AttributeEvent extends BaseEvent {
  loop: number;
  attributeData: unknown;
}

export interface UserInitialData {
  name: string;
  clanTag?: string;
  clanLogo?: string;
  highestLeague?: number;
  combinedRaceLevels?: number;
  randomSeed: number;
  racePreference: {
    race?: number;
  };
  teamPreference: {
    team?: number;
  };
  testMap: boolean;
  testAuto: boolean;
  examine: boolean;
  customInterface: boolean;
  testType: number;
  observe: number;
  hero: string;
  skin: string;
  mount: string;
  toonHandle: string;
  scaledRating?: number;
}

export interface GameOptions {
  lockTeams: boolean;
  teamsTogether: boolean;
  advancedSharedControl: boolean;
  randomRaces: boolean;
  battleNet: boolean;
  amm: boolean;
  competitive: boolean;
  practice: boolean;
  cooperative: boolean;
  noVictoryOrDefeat: boolean;
  heroDuplicatesAllowed: boolean;
  fog: number;
  observers: number;
  userDifficulty: number;
  clientDebugFlags: bigint;
  buildCoachEnabled: boolean;
}

export interface SlotDescription {
  allowedColors: Buffer;
  allowedRaces: Buffer;
  allowedDifficulty: Buffer;
  allowedControls: Buffer;
  allowedObserveTypes: Buffer;
  allowedAIBuilds: Buffer;
}

export interface GameDescription {
  randomValue: number;
  gameCacheName: string;
  gameOptions: GameOptions;
  gameSpeed: number;
  gameType: number;
  maxUsers: number;
  maxObservers: number;
  maxPlayers: number;
  maxTeams: number;
  maxColors: number;
  maxRaces: number;
  maxControls: number;
  mapSizeX: number;
  mapSizeY: number;
  mapFileSyncChecksum: number;
  mapFileName: string;
  mapAuthorName: string;
  modFileSyncChecksum: number;
  slotDescriptions: SlotDescription[];
  defaultDifficulty: number;
  defaultAIBuild: number;
  cacheHandles: string[];
  hasExtensionMod: boolean;
  hasNonBlizzardExtensionMod: boolean;
  isBlizzardMap: boolean;
  isPremadeFFA: boolean;
  isCoopMode: boolean;
  isRealtimeMode: boolean;
}

export interface RewardOverride {
  key: number;
  rewards: number[];
}

export interface LobbySlot {
  control: number;
  userId?: number;
  teamId: number;
  colorPref: {
    color?: number;
  };
  racePref: {
    race?: number;
  };
  difficulty: number;
  aiBuild: number;
  handicap: number;
  observe: number;
  logoIndex: number;
  hero: string;
  skin: string;
  mount: string;
  artifacts: string[];
  workingSetSlotId?: number;
  rewards: number[];
  toonHandle: string;
  licenses: number[];
  tandemLeaderId?: number;
  commander: string;
  commanderLevel: number;
  hasSilencePenalty: boolean;
  tandemId?: number;
  commanderMasteryLevel: number;
  commanderMasteryTalents: number[];
  trophyId: number;
  rewardOverrides: RewardOverride[];
  brutalPlusDifficulty: number;
  retryMutationIndexes: number[];
  aCEnemyRace: number;
  aCEnemyWaveType: number;
  selectedCommanderPrestige: number;
}

export interface LobbyState {
  phase: number;
  maxUsers: number;
  maxObservers: number;
  slots: LobbySlot[];
  randomSeed: number;
  hostUserId?: number;
  isSinglePlayer: boolean;
  pickedMapTag: number;
  gameDuration: number;
  defaultDifficulty: number;
  defaultAIBuild: number;
}

export interface SyncLobbyState {
  userInitialData: UserInitialData[];
  gameDescription: GameDescription;
  lobbyState: LobbyState;
}

export interface ReplayInitData {
  syncLobbyState: SyncLobbyState;
}


export interface ReplayData {
  header: ReplayHeader;
  details: ReplayDetails;
  initData: ReplayInitData;
  gameEvents: GameEvent[];
  messageEvents: MessageEvent[];
  trackerEvents: TrackerEvent[];
  attributesEvents?: AttributeEvent;
}

// Type aliases removed - using base types directly

export interface ReplayOptions {
  decodeGameEvents?: boolean;
  decodeMessageEvents?: boolean;
  decodeTrackerEvents?: boolean;
  decodeInitData?: boolean;
}

