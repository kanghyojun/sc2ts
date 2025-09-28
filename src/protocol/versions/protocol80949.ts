// Protocol for StarCraft II build 80949
// Compatible with builds 80949-93333
// Based on Blizzard's s2protocol implementation

/* eslint-disable @typescript-eslint/no-explicit-any */

// S2Protocol implementation for build 80949 with bzip2 decompression support

import seekBzip from 'seek-bzip';

import { VersionedDecoder, BitPackedDecoder, BitPackedBuffer } from '../sc2-decoder';
import type { ProtocolDecoder, TypeInfo } from '../types';

// Bzip2 decompression utility functions
function isBzip2Compressed(data: Buffer): boolean {
  // Check for bzip2 signature at offset 0 or offset 1
  if (data.length >= 4) {
    // Direct bzip2 header: 'BZh'
    if (data[0] === 0x42 && data[1] === 0x5A && data[2] === 0x68) {
      return true;
    }

    // SC2 bzip2 with 0x10 prefix: 0x10 + 'BZh'
    if (data[0] === 0x10 &&
        data[1] === 0x42 && // 'B'
        data[2] === 0x5A && // 'Z'
        data[3] === 0x68) { // 'h'
      return true;
    }
  }
  return false;
}

function decompressBzip2IfNeeded(data: Buffer): Buffer {
  if (!isBzip2Compressed(data)) {
    return data;
  }

  try {
    // Determine bzip2 data start offset
    let bzip2Data: Buffer;
    if (data[0] === 0x10) {
      // SC2 format: skip first 0x10 byte
      bzip2Data = data.subarray(1);
    } else {
      // Direct bzip2 format
      bzip2Data = data;
    }

    // Decompress using seek-bzip
    const decompressed = seekBzip.decodeBzip2(bzip2Data);
    return Buffer.from(decompressed);
  } catch (error) {
    console.warn('Failed to decompress bzip2 data:', error);
    return data; // Return original data if decompression fails
  }
}

function shouldUseBitPackedDecoder(data: Buffer): boolean {
  // BitPackedDecoder format typically starts with 0x00
  // VersionedDecoder format typically starts with 0x03 (skip byte)
  if (data.length === 0) return false;

  // If data starts with 0x00, it's likely BitPackedDecoder format
  return data[0] === 0x00;
}

// Type information from s2protocol protocol80949.py (compatible with 93333)
const typeinfos: TypeInfo[] = [
  { type: '_int', args: [[0, 7]] },  // 0
  { type: '_int', args: [[0, 4]] },  // 1
  { type: '_int', args: [[0, 5]] },  // 2
  { type: '_int', args: [[0, 6]] },  // 3
  { type: '_int', args: [[0, 14]] }, // 4
  { type: '_int', args: [[0, 22]] }, // 5
  { type: '_int', args: [[0, 32]] }, // 6
  { type: '_choice', args: [[0, 2], { 0: ['m_uint6', 3], 1: ['m_uint14', 4], 2: ['m_uint22', 5], 3: ['m_uint32', 6] }] }, // 7
  { type: '_struct', args: [[['m_userId', 2, -1]]] },  // 8
  { type: '_blob', args: [[0, 8]] },  // 9
  { type: '_int', args: [[0, 8]] },  // 10
  { type: '_struct', args: [[['m_flags', 10, 0], ['m_major', 10, 1], ['m_minor', 10, 2], ['m_revision', 10, 3], ['m_build', 6, 4], ['m_baseBuild', 6, 5]]] },  // 11
  { type: '_int', args: [[0, 3]] }, // 12
  { type: '_bool', args: [] }, // 13
  { type: '_array', args: [[16, 0], 10] }, // 14
  { type: '_optional', args: [14] }, // 15
  { type: '_blob', args: [[16, 0]] }, // 16
  { type: '_struct', args: [[['m_dataDeprecated', 15, 0], ['m_data', 16, 1]]] }, // 17
  { type: '_struct', args: [[['m_signature', 9, 0], ['m_version', 11, 1], ['m_type', 12, 2], ['m_elapsedGameLoops', 6, 3], ['m_useScaledTime', 13, 4], ['m_ngdpRootKey', 17, 5], ['m_dataBuildNum', 6, 6], ['m_replayCompatibilityHash', 17, 7], ['m_ngdpRootKeyIsDevData', 13, 8]]] }, // 18
  { type: '_fourcc', args: [] }, // 19
  { type: '_blob', args: [[0, 7]] }, // 20
  { type: '_int', args: [[0, 64]] }, // 21
  { type: '_struct', args: [[['m_region', 10, 0], ['m_programId', 19, 1], ['m_realm', 6, 2], ['m_name', 20, 3], ['m_id', 21, 4]]] }, // 22
  { type: '_struct', args: [[['m_a', 10, 0], ['m_r', 10, 1], ['m_g', 10, 2], ['m_b', 10, 3]]] }, // 23
  { type: '_int', args: [[0, 2]] }, // 24
  { type: '_optional', args: [10] }, // 25
  { type: '_struct', args: [[['m_name', 9, 0], ['m_toon', 22, 1], ['m_race', 9, 2], ['m_color', 23, 3], ['m_control', 10, 4], ['m_teamId', 1, 5], ['m_handicap', 6, 6], ['m_observe', 24, 7], ['m_result', 24, 8], ['m_workingSetSlotId', 25, 9], ['m_hero', 9, 10]]] }, // 26
  { type: '_array', args: [[0, 5], 26] }, // 27
  { type: '_optional', args: [27] }, // 28
  { type: '_blob', args: [[0, 10]] }, // 29
  { type: '_blob', args: [[0, 11]] }, // 30
  { type: '_struct', args: [[['m_file', 30, 0]]] }, // 31
  { type: '_int', args: [[-9223372036854775808n, 64]] }, // 32 - Use BigInt literal for large number
  { type: '_optional', args: [13] }, // 33
  { type: '_blob', args: [[0, 12]] }, // 34
  { type: '_blob', args: [[40, 0]] }, // 35
  { type: '_array', args: [[0, 6], 35] }, // 36
  { type: '_optional', args: [36] }, // 37
  { type: '_array', args: [[0, 6], 30] }, // 38
  { type: '_optional', args: [38] }, // 39
  { type: '_struct', args: [[['m_playerList', 28, 0], ['m_title', 29, 1], ['m_difficulty', 9, 2], ['m_thumbnail', 31, 3], ['m_isBlizzardMap', 13, 4], ['m_timeUTC', 32, 5], ['m_timeLocalOffset', 32, 6], ['m_restartAsTransitionMap', 33, 16], ['m_disableRecoverGame', 13, 17], ['m_description', 34, 7], ['m_imageFilePath', 30, 8], ['m_campaignIndex', 10, 15], ['m_mapFileName', 30, 9], ['m_cacheHandles', 37, 10], ['m_miniSave', 13, 11], ['m_gameSpeed', 12, 12], ['m_defaultDifficulty', 3, 13], ['m_modPaths', 39, 14]]] }, // 40
  { type: '_optional', args: [9] }, // 41
  { type: '_optional', args: [35] }, // 42
  { type: '_optional', args: [6] }, // 43
  { type: '_struct', args: [[['m_race', 25, -1]]] }, // 44
  { type: '_struct', args: [[['m_team', 25, -1]]] }, // 45
  { type: '_blob', args: [[0, 9]] }, // 46
  { type: '_int', args: [[-2147483648, 32]] }, // 47
  { type: '_optional', args: [47] }, // 48
  { type: '_struct', args: [[['m_name', 9, -19], ['m_clanTag', 41, -18], ['m_clanLogo', 42, -17], ['m_highestLeague', 25, -16], ['m_combinedRaceLevels', 43, -15], ['m_randomSeed', 6, -14], ['m_racePreference', 44, -13], ['m_teamPreference', 45, -12], ['m_testMap', 13, -11], ['m_testAuto', 13, -10], ['m_examine', 13, -9], ['m_customInterface', 13, -8], ['m_testType', 6, -7], ['m_observe', 24, -6], ['m_hero', 46, -5], ['m_skin', 46, -4], ['m_mount', 46, -3], ['m_toonHandle', 20, -2], ['m_scaledRating', 48, -1]]] }, // 49
  { type: '_array', args: [[0, 5], 49] }, // 50
  { type: '_struct', args: [[['m_lockTeams', 13, -16], ['m_teamsTogether', 13, -15], ['m_advancedSharedControl', 13, -14], ['m_randomRaces', 13, -13], ['m_battleNet', 13, -12], ['m_amm', 13, -11], ['m_competitive', 13, -10], ['m_practice', 13, -9], ['m_cooperative', 13, -8], ['m_noVictoryOrDefeat', 13, -7], ['m_heroDuplicatesAllowed', 13, -6], ['m_fog', 24, -5], ['m_observers', 24, -4], ['m_userDifficulty', 24, -3], ['m_clientDebugFlags', 21, -2], ['m_buildCoachEnabled', 13, -1]]] }, // 51
  { type: '_int', args: [[1, 4]] }, // 52
  { type: '_int', args: [[1, 8]] }, // 53
  { type: '_bitarray', args: [[0, 6]] }, // 54
  { type: '_bitarray', args: [[0, 8]] }, // 55
  { type: '_bitarray', args: [[0, 2]] }, // 56
  { type: '_struct', args: [[['m_allowedColors', 54, -6], ['m_allowedRaces', 55, -5], ['m_allowedDifficulty', 54, -4], ['m_allowedControls', 55, -3], ['m_allowedObserveTypes', 56, -2], ['m_allowedAIBuilds', 55, -1]]] }, // 57
  { type: '_array', args: [[0, 5], 57] }, // 58
  { type: '_struct', args: [[['m_randomValue', 6, -28], ['m_gameCacheName', 29, -27], ['m_gameOptions', 51, -26], ['m_gameSpeed', 12, -25], ['m_gameType', 12, -24], ['m_maxUsers', 2, -23], ['m_maxObservers', 2, -22], ['m_maxPlayers', 2, -21], ['m_maxTeams', 52, -20], ['m_maxColors', 3, -19], ['m_maxRaces', 53, -18], ['m_maxControls', 10, -17], ['m_mapSizeX', 10, -16], ['m_mapSizeY', 10, -15], ['m_mapFileSyncChecksum', 6, -14], ['m_mapFileName', 30, -13], ['m_mapAuthorName', 9, -12], ['m_modFileSyncChecksum', 6, -11], ['m_slotDescriptions', 58, -10], ['m_defaultDifficulty', 3, -9], ['m_defaultAIBuild', 10, -8], ['m_cacheHandles', 36, -7], ['m_hasExtensionMod', 13, -6], ['m_hasNonBlizzardExtensionMod', 13, -5], ['m_isBlizzardMap', 13, -4], ['m_isPremadeFFA', 13, -3], ['m_isCoopMode', 13, -2], ['m_isRealtimeMode', 13, -1]]] }, // 59
  { type: '_optional', args: [1] }, // 60
  { type: '_optional', args: [2] }, // 61
  { type: '_struct', args: [[['m_color', 61, -1]]] }, // 62
  { type: '_array', args: [[0, 4], 46] }, // 63
  { type: '_array', args: [[0, 17], 6] }, // 64
  { type: '_array', args: [[0, 16], 6] }, // 65
  { type: '_array', args: [[0, 3], 6] }, // 66
  { type: '_struct', args: [[['m_key', 6, -2], ['m_rewards', 64, -1]]] }, // 67
  { type: '_array', args: [[0, 17], 67] }, // 68
  { type: '_struct', args: [[['m_control', 10, -32], ['m_userId', 60, -31], ['m_teamId', 1, -30], ['m_colorPref', 62, -29], ['m_racePref', 44, -28], ['m_difficulty', 3, -27], ['m_aiBuild', 10, -26], ['m_handicap', 6, -25], ['m_observe', 24, -24], ['m_logoIndex', 6, -23], ['m_hero', 46, -22], ['m_skin', 46, -21], ['m_mount', 46, -20], ['m_artifacts', 63, -19], ['m_workingSetSlotId', 25, -18], ['m_rewards', 64, -17], ['m_toonHandle', 20, -16], ['m_licenses', 65, -15], ['m_tandemLeaderId', 60, -14], ['m_commander', 46, -13], ['m_commanderLevel', 6, -12], ['m_hasSilencePenalty', 13, -11], ['m_tandemId', 60, -10], ['m_commanderMasteryLevel', 6, -9], ['m_commanderMasteryTalents', 66, -8], ['m_trophyId', 6, -7], ['m_rewardOverrides', 68, -6], ['m_brutalPlusDifficulty', 6, -5], ['m_retryMutationIndexes', 66, -4], ['m_aCEnemyRace', 6, -3], ['m_aCEnemyWaveType', 6, -2], ['m_selectedCommanderPrestige', 6, -1]]] }, // 69
  { type: '_array', args: [[0, 5], 69] }, // 70
  { type: '_struct', args: [[['m_phase', 12, -11], ['m_maxUsers', 2, -10], ['m_maxObservers', 2, -9], ['m_slots', 70, -8], ['m_randomSeed', 6, -7], ['m_hostUserId', 60, -6], ['m_isSinglePlayer', 13, -5], ['m_pickedMapTag', 10, -4], ['m_gameDuration', 6, -3], ['m_defaultDifficulty', 3, -2], ['m_defaultAIBuild', 10, -1]]] }, // 71
  { type: '_struct', args: [[['m_userInitialData', 50, -3], ['m_gameDescription', 59, -2], ['m_lobbyState', 71, -1]]] }, // 72
  { type: '_struct', args: [[['m_syncLobbyState', 72, -1]]] }, // 73
  { type: '_struct', args: [[['m_name', 20, -6]]] }, // 74
  { type: '_blob', args: [[0, 6]] }, // 75
  { type: '_struct', args: [[['m_name', 75, -6]]] }, // 76
  { type: '_struct', args: [[['m_name', 75, -8], ['m_type', 6, -7], ['m_data', 20, -6]]] }, // 77
  { type: '_struct', args: [[['m_type', 6, -8], ['m_name', 75, -7], ['m_data', 34, -6]]] }, // 78
  { type: '_array', args: [[0, 5], 10] }, // 79
  { type: '_struct', args: [[['m_signature', 79, -7], ['m_toonHandle', 20, -6]]] }, // 80
  { type: '_struct', args: [[['m_gameFullyDownloaded', 13, -19], ['m_developmentCheatsEnabled', 13, -18], ['m_testCheatsEnabled', 13, -17], ['m_multiplayerCheatsEnabled', 13, -16], ['m_syncChecksummingEnabled', 13, -15], ['m_isMapToMapTransition', 13, -14], ['m_debugPauseEnabled', 13, -13], ['m_useGalaxyAsserts', 13, -12], ['m_platformMac', 13, -11], ['m_cameraFollow', 13, -10], ['m_baseBuildNum', 6, -9], ['m_buildNum', 6, -8], ['m_versionFlags', 6, -7], ['m_hotkeyProfile', 46, -6]]] }, // 81
  { type: '_struct', args: [[]] }, // 82
  { type: '_int', args: [[0, 16]] }, // 83
  { type: '_struct', args: [[['x', 83, -2], ['y', 83, -1]]] }, // 84
  { type: '_struct', args: [[['m_which', 12, -7], ['m_target', 84, -6]]] }, // 85
  { type: '_struct', args: [[['m_fileName', 30, -10], ['m_automatic', 13, -9], ['m_overwrite', 13, -8], ['m_name', 9, -7], ['m_description', 29, -6]]] }, // 86
  { type: '_struct', args: [[['m_sequence', 6, -6]]] }, // 87
  { type: '_struct', args: [[['x', 47, -2], ['y', 47, -1]]] }, // 88
  { type: '_struct', args: [[['m_point', 88, -4], ['m_time', 47, -3], ['m_verb', 29, -2], ['m_arguments', 29, -1]]] }, // 89
  { type: '_struct', args: [[['m_data', 89, -6]]] }, // 90
  { type: '_int', args: [[0, 27]] }, // 91
  { type: '_struct', args: [[['m_abilLink', 83, -3], ['m_abilCmdIndex', 2, -2], ['m_abilCmdData', 25, -1]]] }, // 92
  { type: '_optional', args: [92] }, // 93
  { type: '_null', args: [] }, // 94
  { type: '_int', args: [[0, 20]] }, // 95
  { type: '_struct', args: [[['x', 95, -3], ['y', 95, -2], ['z', 47, -1]]] }, // 96
  { type: '_struct', args: [[['m_targetUnitFlags', 83, -7], ['m_timer', 10, -6], ['m_tag', 6, -5], ['m_snapshotUnitLink', 83, -4], ['m_snapshotControlPlayerId', 60, -3], ['m_snapshotUpkeepPlayerId', 60, -2], ['m_snapshotPoint', 96, -1]]] }, // 97
  { type: '_choice', args: [[0, 2], { 0: ['None', 94], 1: ['TargetPoint', 96], 2: ['TargetUnit', 97], 3: ['Data', 6] }] }, // 98
  { type: '_int', args: [[1, 32]] }, // 99
  { type: '_struct', args: [[['m_cmdFlags', 91, -11], ['m_abil', 93, -10], ['m_data', 98, -9], ['m_sequence', 99, -8], ['m_otherUnit', 43, -7], ['m_unitGroup', 43, -6]]] }, // 100
  { type: '_int', args: [[0, 9]] }, // 101
  { type: '_bitarray', args: [[0, 9]] }, // 102
  { type: '_array', args: [[0, 9], 101] }, // 103
  { type: '_choice', args: [[0, 2], { 0: ['None', 94], 1: ['Mask', 102], 2: ['OneIndices', 103], 3: ['ZeroIndices', 103] }] }, // 104
  { type: '_struct', args: [[['m_unitLink', 83, -4], ['m_subgroupPriority', 10, -3], ['m_intraSubgroupPriority', 10, -2], ['m_count', 101, -1]]] }, // 105
  { type: '_array', args: [[0, 9], 105] }, // 106
  { type: '_array', args: [[0, 9], 6] }, // 107
  { type: '_struct', args: [[['m_subgroupIndex', 101, -4], ['m_removeMask', 104, -3], ['m_addSubgroups', 106, -2], ['m_addUnitTags', 107, -1]]] }, // 108
  { type: '_struct', args: [[['m_controlGroupId', 1, -7], ['m_delta', 108, -6]]] }, // 109
  { type: '_struct', args: [[['m_controlGroupIndex', 1, -8], ['m_controlGroupUpdate', 12, -7], ['m_mask', 104, -6]]] }, // 110
  { type: '_struct', args: [[['m_count', 101, -6], ['m_subgroupCount', 101, -5], ['m_activeSubgroupIndex', 101, -4], ['m_unitTagsChecksum', 6, -3], ['m_subgroupIndicesChecksum', 6, -2], ['m_subgroupsChecksum', 6, -1]]] }, // 111
  { type: '_struct', args: [[['m_controlGroupId', 1, -7], ['m_selectionSyncData', 111, -6]]] }, // 112
  { type: '_array', args: [[0, 3], 47] }, // 113
  { type: '_struct', args: [[['m_recipientId', 1, -7], ['m_resources', 113, -6]]] }, // 114
  { type: '_struct', args: [[['m_chatMessage', 29, -6]]] }, // 115
  { type: '_int', args: [[-128, 8]] }, // 116
  { type: '_struct', args: [[['x', 47, -3], ['y', 47, -2], ['z', 47, -1]]] }, // 117
  { type: '_struct', args: [[['m_beacon', 116, -14], ['m_ally', 116, -13], ['m_flags', 116, -12], ['m_build', 116, -11], ['m_targetUnitTag', 6, -10], ['m_targetUnitSnapshotUnitLink', 83, -9], ['m_targetUnitSnapshotUpkeepPlayerId', 116, -8], ['m_targetUnitSnapshotControlPlayerId', 116, -7], ['m_targetPoint', 117, -6]]] }, // 118
  { type: '_struct', args: [[['m_speed', 12, -6]]] }, // 119
  { type: '_struct', args: [[['m_delta', 116, -6]]] }, // 120
  { type: '_struct', args: [[['m_point', 88, -14], ['m_unit', 6, -13], ['m_unitLink', 83, -12], ['m_unitControlPlayerId', 60, -11], ['m_unitUpkeepPlayerId', 60, -10], ['m_unitPosition', 96, -9], ['m_unitIsUnderConstruction', 13, -8], ['m_pingedMinimap', 13, -7], ['m_option', 47, -6]]] }, // 121
  { type: '_struct', args: [[['m_verb', 29, -7], ['m_arguments', 29, -6]]] }, // 122
  { type: '_struct', args: [[['m_alliance', 6, -7], ['m_control', 6, -6]]] }, // 123
  { type: '_struct', args: [[['m_unitTag', 6, -6]]] }, // 124
  { type: '_struct', args: [[['m_unitTag', 6, -7], ['m_flags', 10, -6]]] }, // 125
  { type: '_struct', args: [[['m_conversationId', 47, -7], ['m_replyId', 47, -6]]] }, // 126
  { type: '_optional', args: [20] }, // 127
  { type: '_struct', args: [[['m_gameUserId', 1, -6], ['m_observe', 24, -5], ['m_name', 9, -4], ['m_toonHandle', 127, -3], ['m_clanTag', 41, -2], ['m_clanLogo', 42, -1]]] }, // 128
  { type: '_array', args: [[0, 5], 128] }, // 129
  { type: '_int', args: [[0, 1]] }, // 130
  { type: '_struct', args: [[['m_userInfos', 129, -7], ['m_method', 130, -6]]] }, // 131
  { type: '_struct', args: [[['m_purchaseItemId', 47, -6]]] }, // 132
  { type: '_struct', args: [[['m_difficultyLevel', 47, -6]]] }, // 133
  { type: '_choice', args: [[0, 3], { 0: ['None', 94], 1: ['Checked', 13], 2: ['ValueChanged', 6], 3: ['SelectionChanged', 47], 4: ['TextChanged', 30], 5: ['MouseButton', 6] }] }, // 134
  { type: '_struct', args: [[['m_controlId', 47, -8], ['m_eventType', 47, -7], ['m_eventData', 134, -6]]] }, // 135
  { type: '_struct', args: [[['m_soundHash', 6, -7], ['m_length', 6, -6]]] }, // 136
  { type: '_array', args: [[0, 7], 6] }, // 137
  { type: '_struct', args: [[['m_soundHash', 137, -2], ['m_length', 137, -1]]] }, // 138
  { type: '_struct', args: [[['m_syncInfo', 138, -6]]] }, // 139
  { type: '_struct', args: [[['m_queryId', 83, -8], ['m_lengthMs', 6, -7], ['m_finishGameLoop', 6, -6]]] }, // 140
  { type: '_struct', args: [[['m_queryId', 83, -7], ['m_lengthMs', 6, -6]]] }, // 141
  { type: '_struct', args: [[['m_animWaitQueryId', 83, -6]]] }, // 142
  { type: '_struct', args: [[['m_sound', 6, -6]]] }, // 143
  { type: '_struct', args: [[['m_transmissionId', 47, -7], ['m_thread', 6, -6]]] }, // 144
  { type: '_struct', args: [[['m_transmissionId', 47, -6]]] }, // 145
  { type: '_optional', args: [84] }, // 146
  { type: '_optional', args: [83] }, // 147
  { type: '_optional', args: [116] }, // 148
  { type: '_struct', args: [[['m_target', 146, -11], ['m_distance', 147, -10], ['m_pitch', 147, -9], ['m_yaw', 147, -8], ['m_reason', 148, -7], ['m_follow', 13, -6]]] }, // 149
  { type: '_struct', args: [[['m_skipType', 130, -6]]] }, // 150
  { type: '_int', args: [[0, 11]] }, // 151
  { type: '_struct', args: [[['x', 151, -2], ['y', 151, -1]]] }, // 152
  { type: '_struct', args: [[['m_button', 6, -10], ['m_down', 13, -9], ['m_posUI', 152, -8], ['m_posWorld', 96, -7], ['m_flags', 116, -6]]] }, // 153
  { type: '_struct', args: [[['m_posUI', 152, -8], ['m_posWorld', 96, -7], ['m_flags', 116, -6]]] }, // 154
  { type: '_struct', args: [[['m_achievementLink', 83, -6]]] }, // 155
  { type: '_struct', args: [[['m_hotkey', 6, -7], ['m_down', 13, -6]]] }, // 156
  { type: '_struct', args: [[['m_abilLink', 83, -8], ['m_abilCmdIndex', 2, -7], ['m_state', 116, -6]]] }, // 157
  { type: '_struct', args: [[['m_soundtrack', 6, -6]]] }, // 158
  { type: '_struct', args: [[['m_planetId', 47, -6]]] }, // 159
  { type: '_struct', args: [[['m_key', 116, -7], ['m_flags', 116, -6]]] }, // 160
  { type: '_struct', args: [[['m_resources', 113, -6]]] }, // 161
  { type: '_struct', args: [[['m_fulfillRequestId', 47, -6]]] }, // 162
  { type: '_struct', args: [[['m_cancelRequestId', 47, -6]]] }, // 163
  { type: '_struct', args: [[['m_error', 47, -7], ['m_abil', 93, -6]]] }, // 164
  { type: '_struct', args: [[['m_researchItemId', 47, -6]]] }, // 165
  { type: '_struct', args: [[['m_mercenaryId', 47, -6]]] }, // 166
  { type: '_struct', args: [[['m_battleReportId', 47, -7], ['m_difficultyLevel', 47, -6]]] }, // 167
  { type: '_struct', args: [[['m_battleReportId', 47, -6]]] }, // 168
  { type: '_struct', args: [[['m_decrementSeconds', 47, -6]]] }, // 169
  { type: '_struct', args: [[['m_portraitId', 47, -6]]] }, // 170
  { type: '_struct', args: [[['m_functionName', 20, -6]]] }, // 171
  { type: '_struct', args: [[['m_result', 47, -6]]] }, // 172
  { type: '_struct', args: [[['m_gameMenuItemIndex', 47, -6]]] }, // 173
  { type: '_int', args: [[-32768, 16]] }, // 174
  { type: '_struct', args: [[['m_wheelSpin', 174, -7], ['m_flags', 116, -6]]] }, // 175
  { type: '_struct', args: [[['m_purchaseCategoryId', 47, -6]]] }, // 176
  { type: '_struct', args: [[['m_button', 83, -6]]] }, // 177
  { type: '_struct', args: [[['m_cutsceneId', 47, -7], ['m_bookmarkName', 20, -6]]] }, // 178
  { type: '_struct', args: [[['m_cutsceneId', 47, -6]]] }, // 179
  { type: '_struct', args: [[['m_cutsceneId', 47, -8], ['m_conversationLine', 20, -7], ['m_altConversationLine', 20, -6]]] }, // 180
  { type: '_struct', args: [[['m_cutsceneId', 47, -7], ['m_conversationLine', 20, -6]]] }, // 181
  { type: '_struct', args: [[['m_leaveReason', 1, -6]]] }, // 182
  { type: '_struct', args: [[['m_observe', 24, -12], ['m_name', 9, -11], ['m_toonHandle', 127, -10], ['m_clanTag', 41, -9], ['m_clanLogo', 42, -8], ['m_hijack', 13, -7], ['m_hijackCloneGameUserId', 60, -6]]] }, // 183
  { type: '_optional', args: [99] }, // 184
  { type: '_struct', args: [[['m_state', 24, -7], ['m_sequence', 184, -6]]] }, // 185
  { type: '_struct', args: [[['m_target', 96, -6]]] }, // 186
  { type: '_struct', args: [[['m_target', 97, -6]]] }, // 187
  { type: '_struct', args: [[['m_catalog', 10, -9], ['m_entry', 83, -8], ['m_field', 9, -7], ['m_value', 9, -6]]] }, // 188
  { type: '_struct', args: [[['m_index', 6, -6]]] }, // 189
  { type: '_struct', args: [[['m_shown', 13, -6]]] }, // 190
  { type: '_struct', args: [[['m_syncTime', 6, -6]]] }, // 191
  { type: '_struct', args: [[['m_recipient', 12, -3], ['m_string', 30, -2]]] }, // 192
  { type: '_struct', args: [[['m_recipient', 12, -3], ['m_point', 88, -2]]] }, // 193
  { type: '_struct', args: [[['m_progress', 47, -2]]] }, // 194
  { type: '_struct', args: [[['m_status', 24, -2]]] }, // 195
  { type: '_struct', args: [[['m_scoreValueMineralsCurrent', 47, 0], ['m_scoreValueVespeneCurrent', 47, 1], ['m_scoreValueMineralsCollectionRate', 47, 2], ['m_scoreValueVespeneCollectionRate', 47, 3], ['m_scoreValueWorkersActiveCount', 47, 4], ['m_scoreValueMineralsUsedInProgressArmy', 47, 5], ['m_scoreValueMineralsUsedInProgressEconomy', 47, 6], ['m_scoreValueMineralsUsedInProgressTechnology', 47, 7], ['m_scoreValueVespeneUsedInProgressArmy', 47, 8], ['m_scoreValueVespeneUsedInProgressEconomy', 47, 9], ['m_scoreValueVespeneUsedInProgressTechnology', 47, 10], ['m_scoreValueMineralsUsedCurrentArmy', 47, 11], ['m_scoreValueMineralsUsedCurrentEconomy', 47, 12], ['m_scoreValueMineralsUsedCurrentTechnology', 47, 13], ['m_scoreValueVespeneUsedCurrentArmy', 47, 14], ['m_scoreValueVespeneUsedCurrentEconomy', 47, 15], ['m_scoreValueVespeneUsedCurrentTechnology', 47, 16], ['m_scoreValueMineralsLostArmy', 47, 17], ['m_scoreValueMineralsLostEconomy', 47, 18], ['m_scoreValueMineralsLostTechnology', 47, 19], ['m_scoreValueVespeneLostArmy', 47, 20], ['m_scoreValueVespeneLostEconomy', 47, 21], ['m_scoreValueVespeneLostTechnology', 47, 22], ['m_scoreValueMineralsKilledArmy', 47, 23], ['m_scoreValueMineralsKilledEconomy', 47, 24], ['m_scoreValueMineralsKilledTechnology', 47, 25], ['m_scoreValueVespeneKilledArmy', 47, 26], ['m_scoreValueVespeneKilledEconomy', 47, 27], ['m_scoreValueVespeneKilledTechnology', 47, 28], ['m_scoreValueFoodUsed', 47, 29], ['m_scoreValueFoodMade', 47, 30], ['m_scoreValueMineralsUsedActiveForces', 47, 31], ['m_scoreValueVespeneUsedActiveForces', 47, 32], ['m_scoreValueMineralsFriendlyFireArmy', 47, 33], ['m_scoreValueMineralsFriendlyFireEconomy', 47, 34], ['m_scoreValueMineralsFriendlyFireTechnology', 47, 35], ['m_scoreValueVespeneFriendlyFireArmy', 47, 36], ['m_scoreValueVespeneFriendlyFireEconomy', 47, 37], ['m_scoreValueVespeneFriendlyFireTechnology', 47, 38]]] }, // 196
  { type: '_struct', args: [[['m_playerId', 1, 0], ['m_stats', 196, 1]]] }, // 197
  { type: '_optional', args: [29] }, // 198
  { type: '_struct', args: [[['m_unitTagIndex', 6, 0], ['m_unitTagRecycle', 6, 1], ['m_unitTypeName', 29, 2], ['m_controlPlayerId', 1, 3], ['m_upkeepPlayerId', 1, 4], ['m_x', 10, 5], ['m_y', 10, 6], ['m_creatorUnitTagIndex', 43, 7], ['m_creatorUnitTagRecycle', 43, 8], ['m_creatorAbilityName', 198, 9]]] }, // 199
  { type: '_struct', args: [[['m_unitTagIndex', 6, 0], ['m_unitTagRecycle', 6, 1], ['m_killerPlayerId', 60, 2], ['m_x', 10, 3], ['m_y', 10, 4], ['m_killerUnitTagIndex', 43, 5], ['m_killerUnitTagRecycle', 43, 6]]] }, // 200
  { type: '_struct', args: [[['m_unitTagIndex', 6, 0], ['m_unitTagRecycle', 6, 1], ['m_controlPlayerId', 1, 2], ['m_upkeepPlayerId', 1, 3]]] }, // 201
  { type: '_struct', args: [[['m_unitTagIndex', 6, 0], ['m_unitTagRecycle', 6, 1], ['m_unitTypeName', 29, 2]]] }, // 202
  { type: '_struct', args: [[['m_playerId', 1, 0], ['m_upgradeTypeName', 29, 1], ['m_count', 47, 2]]] }, // 203
  { type: '_struct', args: [[['m_unitTagIndex', 6, 0], ['m_unitTagRecycle', 6, 1], ['m_unitTypeName', 29, 2], ['m_controlPlayerId', 1, 3], ['m_upkeepPlayerId', 1, 4], ['m_x', 10, 5], ['m_y', 10, 6]]] }, // 204
  { type: '_struct', args: [[['m_unitTagIndex', 6, 0], ['m_unitTagRecycle', 6, 1]]] }, // 205
  { type: '_array', args: [[0, 10], 47] }, // 206
  { type: '_struct', args: [[['m_firstUnitIndex', 6, 0], ['m_items', 206, 1]]] }, // 207
  { type: '_struct', args: [[['m_playerId', 1, 0], ['m_type', 6, 1], ['m_userId', 43, 2], ['m_slotId', 43, 3]]] }, // 208
];

// Complete event type mappings from s2protocol
const game_event_types: Record<number, [number, string]> = {
  5: [82, 'NNet.Game.SUserFinishedLoadingSyncEvent'],
  7: [81, 'NNet.Game.SUserOptionsEvent'],
  9: [74, 'NNet.Game.SBankFileEvent'],
  10: [76, 'NNet.Game.SBankSectionEvent'],
  11: [77, 'NNet.Game.SBankKeyEvent'],
  12: [78, 'NNet.Game.SBankValueEvent'],
  13: [80, 'NNet.Game.SBankSignatureEvent'],
  14: [85, 'NNet.Game.SCameraSaveEvent'],
  21: [86, 'NNet.Game.SSaveGameEvent'],
  22: [82, 'NNet.Game.SSaveGameDoneEvent'],
  23: [82, 'NNet.Game.SLoadGameDoneEvent'],
  25: [87, 'NNet.Game.SCommandManagerResetEvent'],
  26: [90, 'NNet.Game.SGameCheatEvent'],
  27: [100, 'NNet.Game.SCmdEvent'],
  28: [109, 'NNet.Game.SSelectionDeltaEvent'],
  29: [110, 'NNet.Game.SControlGroupUpdateEvent'],
  30: [112, 'NNet.Game.SSelectionSyncCheckEvent'],
  31: [114, 'NNet.Game.SResourceTradeEvent'],
  32: [115, 'NNet.Game.STriggerChatMessageEvent'],
  33: [118, 'NNet.Game.SAICommunicateEvent'],
  34: [119, 'NNet.Game.SSetAbsoluteGameSpeedEvent'],
  35: [120, 'NNet.Game.SAddAbsoluteGameSpeedEvent'],
  36: [121, 'NNet.Game.STriggerPingEvent'],
  37: [122, 'NNet.Game.SBroadcastCheatEvent'],
  38: [123, 'NNet.Game.SAllianceEvent'],
  39: [124, 'NNet.Game.SUnitClickEvent'],
  40: [125, 'NNet.Game.SUnitHighlightEvent'],
  41: [126, 'NNet.Game.STriggerReplySelectedEvent'],
  43: [131, 'NNet.Game.SHijackReplayGameEvent'],
  44: [82, 'NNet.Game.STriggerSkippedEvent'],
  45: [136, 'NNet.Game.STriggerSoundLengthQueryEvent'],
  46: [143, 'NNet.Game.STriggerSoundOffsetEvent'],
  47: [144, 'NNet.Game.STriggerTransmissionOffsetEvent'],
  48: [145, 'NNet.Game.STriggerTransmissionCompleteEvent'],
  49: [149, 'NNet.Game.SCameraUpdateEvent'],
  50: [82, 'NNet.Game.STriggerAbortMissionEvent'],
  51: [132, 'NNet.Game.STriggerPurchaseMadeEvent'],
  52: [82, 'NNet.Game.STriggerPurchaseExitEvent'],
  53: [133, 'NNet.Game.STriggerPlanetMissionLaunchedEvent'],
  54: [82, 'NNet.Game.STriggerPlanetPanelCanceledEvent'],
  55: [135, 'NNet.Game.STriggerDialogControlEvent'],
  56: [139, 'NNet.Game.STriggerSoundLengthSyncEvent'],
  57: [150, 'NNet.Game.STriggerConversationSkippedEvent'],
  58: [153, 'NNet.Game.STriggerMouseClickedEvent'],
  59: [154, 'NNet.Game.STriggerMouseMovedEvent'],
  60: [155, 'NNet.Game.SAchievementAwardedEvent'],
  61: [156, 'NNet.Game.STriggerHotkeyPressedEvent'],
  62: [157, 'NNet.Game.STriggerTargetModeUpdateEvent'],
  63: [82, 'NNet.Game.STriggerPlanetPanelReplayEvent'],
  64: [158, 'NNet.Game.STriggerSoundtrackDoneEvent'],
  65: [159, 'NNet.Game.STriggerPlanetMissionSelectedEvent'],
  66: [160, 'NNet.Game.STriggerKeyPressedEvent'],
  67: [171, 'NNet.Game.STriggerMovieFunctionEvent'],
  68: [82, 'NNet.Game.STriggerPlanetPanelBirthCompleteEvent'],
  69: [82, 'NNet.Game.STriggerPlanetPanelDeathCompleteEvent'],
  70: [161, 'NNet.Game.SResourceRequestEvent'],
  71: [162, 'NNet.Game.SResourceRequestFulfillEvent'],
  72: [163, 'NNet.Game.SResourceRequestCancelEvent'],
  73: [82, 'NNet.Game.STriggerResearchPanelExitEvent'],
  74: [82, 'NNet.Game.STriggerResearchPanelPurchaseEvent'],
  75: [165, 'NNet.Game.STriggerResearchPanelSelectionChangedEvent'],
  76: [164, 'NNet.Game.STriggerCommandErrorEvent'],
  77: [82, 'NNet.Game.STriggerMercenaryPanelExitEvent'],
  78: [82, 'NNet.Game.STriggerMercenaryPanelPurchaseEvent'],
  79: [166, 'NNet.Game.STriggerMercenaryPanelSelectionChangedEvent'],
  80: [82, 'NNet.Game.STriggerVictoryPanelExitEvent'],
  81: [82, 'NNet.Game.STriggerBattleReportPanelExitEvent'],
  82: [167, 'NNet.Game.STriggerBattleReportPanelPlayMissionEvent'],
  83: [168, 'NNet.Game.STriggerBattleReportPanelPlaySceneEvent'],
  84: [168, 'NNet.Game.STriggerBattleReportPanelSelectionChangedEvent'],
  85: [133, 'NNet.Game.STriggerVictoryPanelPlayMissionAgainEvent'],
  86: [82, 'NNet.Game.STriggerMovieStartedEvent'],
  87: [82, 'NNet.Game.STriggerMovieFinishedEvent'],
  88: [169, 'NNet.Game.SDecrementGameTimeRemainingEvent'],
  89: [170, 'NNet.Game.STriggerPortraitLoadedEvent'],
  90: [172, 'NNet.Game.STriggerCustomDialogDismissedEvent'],
  91: [173, 'NNet.Game.STriggerGameMenuItemSelectedEvent'],
  92: [175, 'NNet.Game.STriggerMouseWheelEvent'],
  93: [132, 'NNet.Game.STriggerPurchasePanelSelectedPurchaseItemChangedEvent'],
  94: [176, 'NNet.Game.STriggerPurchasePanelSelectedPurchaseCategoryChangedEvent'],
  95: [177, 'NNet.Game.STriggerButtonPressedEvent'],
  96: [82, 'NNet.Game.STriggerGameCreditsFinishedEvent'],
  97: [178, 'NNet.Game.STriggerCutsceneBookmarkFiredEvent'],
  98: [179, 'NNet.Game.STriggerCutsceneEndSceneFiredEvent'],
  99: [180, 'NNet.Game.STriggerCutsceneConversationLineEvent'],
  100: [181, 'NNet.Game.STriggerCutsceneConversationLineMissingEvent'],
  101: [182, 'NNet.Game.SGameUserLeaveEvent'],
  102: [183, 'NNet.Game.SGameUserJoinEvent'],
  103: [185, 'NNet.Game.SCommandManagerStateEvent'],
  104: [186, 'NNet.Game.SCmdUpdateTargetPointEvent'],
  105: [187, 'NNet.Game.SCmdUpdateTargetUnitEvent'],
  106: [140, 'NNet.Game.STriggerAnimLengthQueryByNameEvent'],
  107: [141, 'NNet.Game.STriggerAnimLengthQueryByPropsEvent'],
  108: [142, 'NNet.Game.STriggerAnimOffsetEvent'],
  109: [188, 'NNet.Game.SCatalogModifyEvent'],
  110: [189, 'NNet.Game.SHeroTalentTreeSelectedEvent'],
  111: [82, 'NNet.Game.STriggerProfilerLoggingFinishedEvent'],
  112: [190, 'NNet.Game.SHeroTalentTreeSelectionPanelToggledEvent'],
  113: [82, 'NNet.Game.STriggerEvent113'], // Unknown event from build 94137+
  114: [82, 'NNet.Game.STriggerEvent114'], // Unknown event from build 94137+
  115: [82, 'NNet.Game.STriggerEvent115'], // Unknown event from build 94137+
  116: [191, 'NNet.Game.SSetSyncLoadingTimeEvent'],
  117: [191, 'NNet.Game.SSetSyncPlayingTimeEvent'],
  118: [191, 'NNet.Game.SPeerSetSyncLoadingTimeEvent'],
  119: [191, 'NNet.Game.SPeerSetSyncPlayingTimeEvent'],
  120: [82, 'NNet.Game.STriggerEvent120'], // Unknown event from build 94137+
  121: [82, 'NNet.Game.STriggerEvent121'], // Unknown event from build 94137+
  122: [82, 'NNet.Game.STriggerEvent122'], // Unknown event from build 94137+
  123: [82, 'NNet.Game.STriggerEvent123'], // Unknown event from build 94137+
  124: [82, 'NNet.Game.STriggerEvent124'], // Unknown event from build 94137+
};

const message_event_types: Record<number, [number, string]> = {
  0: [192, 'NNet.Game.SChatMessage'],
  1: [193, 'NNet.Game.SPingMessage'],
  2: [194, 'NNet.Game.SLoadingProgressMessage'],
  3: [82, 'NNet.Game.SServerPingMessage'],
  4: [195, 'NNet.Game.SReconnectNotifyMessage'],
};

const tracker_event_types: Record<number, [number, string]> = {
  0: [197, 'NNet.Replay.Tracker.SPlayerStatsEvent'],
  1: [199, 'NNet.Replay.Tracker.SUnitBornEvent'],
  2: [200, 'NNet.Replay.Tracker.SUnitDiedEvent'],
  3: [201, 'NNet.Replay.Tracker.SUnitOwnerChangeEvent'],
  4: [202, 'NNet.Replay.Tracker.SUnitTypeChangeEvent'],
  5: [203, 'NNet.Replay.Tracker.SUpgradeEvent'],
  6: [204, 'NNet.Replay.Tracker.SUnitInitEvent'],
  7: [205, 'NNet.Replay.Tracker.SUnitDoneEvent'],
  8: [207, 'NNet.Replay.Tracker.SUnitPositionsEvent'],
  9: [208, 'NNet.Replay.Tracker.SPlayerSetupEvent'],
};

// Type IDs from s2protocol
const svaruint32_typeid = 7;
const replay_userid_typeid = 8;
const replay_header_typeid = 18;
const game_details_typeid = 40;
const replay_initdata_typeid = 73;
const game_eventid_typeid = 0;
const message_eventid_typeid = 1;
const tracker_eventid_typeid = 2;

function varuint32_value(value: Record<string, unknown>): number {
  for (const v of Object.values(value)) {
    if (typeof v === 'number') {
      return v;
    }
  }
  return 0;
}

function userid_value(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value === 'object') {
    // Extract number from userid object
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (typeof v === 'number') {
        return v;
      }
    }
  }
  return 0;
}

// Protocol 80949 supports both VersionedDecoder and BitPackedDecoder formats

function* decodeEventStream(
  decoder: VersionedDecoder,
  eventid_typeid: number,
  event_types: Record<number, [number, string]>,
  decode_user_id: boolean,
): Generator<Record<string, unknown>> {
  let gameloop = 0;

  while (!decoder.done()) {
    const start_bits = decoder.used_bits();

    // Decode the gameloop delta before each event
    const delta = varuint32_value(decoder.instance(svaruint32_typeid) as Record<string, unknown>);
    gameloop += delta;

    // Decode the userid before each event
    let userid: unknown;
    if (decode_user_id) {
      userid = decoder.instance(replay_userid_typeid);
    }

    // Decode the event id
    const eventid = decoder.instance(eventid_typeid) as number;
    const event_info = event_types[eventid];
    if (!event_info) {
      // Skip unknown events gracefully for build 94137+ compatibility
      decoder.byte_align();
      continue;
    }

    const [typeid, typename] = event_info;

    // Decode the event struct instance
    const event = decoder.instance(typeid) as Record<string, unknown>;
    event['_event'] = typename;
    event['_eventid'] = eventid;
    event['_gameloop'] = gameloop;

    if (decode_user_id) {
      event['_userid'] = userid_value(userid);
    }

    // Byte align for next event
    decoder.byte_align();

    // Insert bits used in stream
    event['_bits'] = decoder.used_bits() - start_bits;

    yield event;
  }
}

function* decodeEventStreamBitPacked(
  decoder: BitPackedDecoder,
  eventid_typeid: number,
  event_types: Record<number, [number, string]>,
  decode_user_id: boolean,
): Generator<Record<string, unknown>> {
  let gameloop = 0;

  while (!decoder.done()) {
    const start_bits = decoder.used_bits();

    // Decode the gameloop delta before each event
    const delta = varuint32_value(decoder.instance(svaruint32_typeid) as Record<string, unknown>);
    gameloop += delta;

    // Decode the userid before each event
    let userid: unknown;
    if (decode_user_id) {
      userid = decoder.instance(replay_userid_typeid);
    }

    // Decode the event id
    const eventid = decoder.instance(eventid_typeid) as number;
    const event_info = event_types[eventid];
    if (!event_info) {
      // Skip unknown events gracefully for build 94137+ compatibility
      // Use silent skip to avoid console noise - these are expected for newer builds
      decoder.byte_align();
      continue;
    }

    const [typeid, typename] = event_info;

    // Decode the event struct instance
    const event = decoder.instance(typeid) as Record<string, unknown>;
    event['_event'] = typename;
    event['_eventid'] = eventid;
    event['_gameloop'] = gameloop;

    if (decode_user_id) {
      event['_userid'] = userid_value(userid);
    }

    // Byte align for next event
    decoder.byte_align();

    // Insert bits used in stream
    event['_bits'] = decoder.used_bits() - start_bits;

    yield event;
  }
}

const protocol80949: ProtocolDecoder = {
  version: 80949,
  decodeReplayHeader(data: Buffer): any {
    const decompressedData = decompressBzip2IfNeeded(data);
    const decoder = new VersionedDecoder(decompressedData, typeinfos);
    return decoder.instance(replay_header_typeid);
  },

  decodeReplayDetails(data: Buffer): any {
    const decompressedData = decompressBzip2IfNeeded(data);
    const decoder = new VersionedDecoder(decompressedData, typeinfos);
    return decoder.instance(game_details_typeid);
  },

  decodeReplayInitdata(data: Buffer): any {
    const decompressedData = decompressBzip2IfNeeded(data);
    const decoder = new VersionedDecoder(decompressedData, typeinfos);
    return decoder.instance(replay_initdata_typeid);
  },

  decodeReplayGameEvents(data: Buffer): any[] {
    const decompressedData = decompressBzip2IfNeeded(data);
    const events = [];

    if (shouldUseBitPackedDecoder(decompressedData)) {
      // Use BitPackedDecoder for decompressed build 94137+ data
      const decoder = new BitPackedDecoder(decompressedData, typeinfos);
      for (const event of decodeEventStreamBitPacked(decoder, game_eventid_typeid, game_event_types, true)) {
        events.push(event);
      }
    } else {
      // Use VersionedDecoder for standard format
      const decoder = new VersionedDecoder(decompressedData, typeinfos);
      for (const event of decodeEventStream(decoder, game_eventid_typeid, game_event_types, true)) {
        events.push(event);
      }
    }

    return events;
  },

  decodeReplayMessageEvents(data: Buffer): any[] {
    const decompressedData = decompressBzip2IfNeeded(data);
    const events = [];

    if (shouldUseBitPackedDecoder(decompressedData)) {
      // Use BitPackedDecoder for decompressed build 94137+ data
      const decoder = new BitPackedDecoder(decompressedData, typeinfos);
      for (const event of decodeEventStreamBitPacked(decoder, message_eventid_typeid, message_event_types, true)) {
        events.push(event);
      }
    } else {
      // Use VersionedDecoder for standard format
      const decoder = new VersionedDecoder(decompressedData, typeinfos);
      for (const event of decodeEventStream(decoder, message_eventid_typeid, message_event_types, true)) {
        events.push(event);
      }
    }

    return events;
  },

  decodeReplayTrackerEvents(data: Buffer): any[] {
    const decompressedData = decompressBzip2IfNeeded(data);
    const events = [];

    if (shouldUseBitPackedDecoder(decompressedData)) {
      // Use BitPackedDecoder for decompressed build 94137+ data
      const decoder = new BitPackedDecoder(decompressedData, typeinfos);
      for (const event of decodeEventStreamBitPacked(decoder, tracker_eventid_typeid, tracker_event_types, false)) {
        events.push(event);
      }
    } else {
      // Use VersionedDecoder for standard format
      const decoder = new VersionedDecoder(decompressedData, typeinfos);
      for (const event of decodeEventStream(decoder, tracker_eventid_typeid, tracker_event_types, false)) {
        events.push(event);
      }
    }

    return events;
  },

  decodeReplayAttributesEvents(data: Buffer): any {
    const buffer = new BitPackedBuffer(data, 'little');
    const attributes: Record<string, unknown> = {};

    if (!buffer.done()) {
      attributes['source'] = buffer.readBits(8);
      attributes['mapNamespace'] = buffer.readBits(32);
      buffer.readBits(32); // count - not used currently
      attributes['scopes'] = {};

      const scopes = attributes['scopes'] as Record<number, Record<number, unknown[]>>;

      while (!buffer.done()) {
        const value: Record<string, unknown> = {};
        value['namespace'] = buffer.readBits(32);
        const attrid = buffer.readBits(32);
        value['attrid'] = attrid;
        const scope = buffer.readBits(8);
        const valueBytes = buffer.readAlignedBytes(4);
        value['value'] = valueBytes.reverse().filter(b => b !== 0);

        if (!(scope in scopes)) {
          scopes[scope] = {};
        }
        const scopeData = scopes[scope];
        if (scopeData && !(attrid in scopeData)) {
          scopeData[attrid] = [];
        }
        const attridData = scopeData?.[attrid];
        if (attridData) {
          attridData.push(value);
        }
      }
    }

    return attributes;
  },
};

export { typeinfos };
export default protocol80949;
