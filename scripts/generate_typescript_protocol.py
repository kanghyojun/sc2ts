# # Decoding instructions for each protocol type.
# typeinfos = [
# ]
# 
# # Map from protocol NNet.Game.*Event eventid to (typeid, name)
# game_event_types = {
# }
# 
# # The typeid of the NNet.Game.EEventId enum.
# game_eventid_typeid = 0
# 
# # Map from protocol NNet.Game.*Message eventid to (typeid, name)
# message_event_types = {
# }
# 
# # The typeid of the NNet.Game.EMessageId enum.
# message_eventid_typeid = 1
# 
# # Map from protocol NNet.Replay.Tracker.*Event eventid to (typeid, name)
# tracker_event_types = {
# }
# 
# # NOTE: older builds may not support some types and the generated methods
# # may fail to function properly, if specific backwards compatibility is 
# # needed these values should be tested against for None
# 
# # The typeid of the NNet.Replay.Tracker.EEventId enum.
# tracker_eventid_typeid = 2
# 
# # The typeid of NNet.SVarUint32 (the type used to encode gameloop deltas).
# svaruint32_typeid = 7
# 
# # The typeid of NNet.Replay.SGameUserId (the type used to encode player ids).
# replay_userid_typeid = 8
# 
# # The typeid of NNet.Replay.SHeader (the type used to store replay game version and length).
# replay_header_typeid = 18
# 
# # The typeid of NNet.Game.SDetails (the type used to store overall replay details).
# game_details_typeid = 40
# 
# # The typeid of NNet.Replay.SInitData (the type used to store the inital lobby).
# replay_initdata_typeid = 73
#
# you can copy from s2protocol/versions/protocol80949.py

def convert_typeinfos_to_typescript():
    """Convert protocol typeinfos to TypeScript format"""

    print("// Generated TypeScript protocol definitions")
    print("// Auto-generated from protocol typeinfos")
    print()

    # Convert typeinfos to TypeScript interface
    print("export interface ProtocolTypeInfo {")
    print("  type: string;")
    print("  data: any[];")
    print("}")
    print()

    print("export const protocolTypeinfos: ProtocolTypeInfo[] = [")

    for i, (type_name, type_data) in enumerate(typeinfos):
        # Format the type data for TypeScript
        formatted_data = str(type_data).replace("'", '"')
        print(f'  {{ type: "{type_name}", data: {formatted_data} }}, // {i}')

    print("];")
    print()

    # Convert game event types
    print("export const gameEventTypes: Record<number, { typeId: number; name: string }> = {")
    for event_id, (type_id, name) in game_event_types.items():
        print(f'  {event_id}: {{ typeId: {type_id}, name: "{name}" }},')
    print("};")
    print()

    # Convert message event types
    print("export const messageEventTypes: Record<number, { typeId: number; name: string }> = {")
    for event_id, (type_id, name) in message_event_types.items():
        print(f'  {event_id}: {{ typeId: {type_id}, name: "{name}" }},')
    print("};")
    print()

    # Convert tracker event types
    print("export const trackerEventTypes: Record<number, { typeId: number; name: string }> = {")
    for event_id, (type_id, name) in tracker_event_types.items():
        print(f'  {event_id}: {{ typeId: {type_id}, name: "{name}" }},')
    print("};")
    print()

    # Export important type IDs as constants
    print("// Important protocol type IDs")
    print(f"export const GAME_EVENTID_TYPEID = {game_eventid_typeid};")
    print(f"export const MESSAGE_EVENTID_TYPEID = {message_eventid_typeid};")
    print(f"export const TRACKER_EVENTID_TYPEID = {tracker_eventid_typeid};")
    print(f"export const SVARUINT32_TYPEID = {svaruint32_typeid};")
    print(f"export const REPLAY_USERID_TYPEID = {replay_userid_typeid};")
    print(f"export const REPLAY_HEADER_TYPEID = {replay_header_typeid};")
    print(f"export const GAME_DETAILS_TYPEID = {game_details_typeid};")
    print(f"export const REPLAY_INITDATA_TYPEID = {replay_initdata_typeid};")

def generate_typescript_protocol_file():
    """Generate a complete TypeScript protocol file"""

    # TypeScript type definitions
    typescript_content = '''// Auto-generated TypeScript protocol definitions
// Generated from StarCraft II protocol specification

export interface ProtocolTypeInfo {
  type: string;
  data: any[];
}

export interface EventType {
  typeId: number;
  name: string;
}

// Protocol type information array
export const protocolTypeinfos: ProtocolTypeInfo[] = [
'''

    # Add typeinfos
    for i, (type_name, type_data) in enumerate(typeinfos):
        formatted_data = str(type_data).replace("'", '"')
        typescript_content += f'  {{ type: "{type_name}", data: {formatted_data} }}, // {i}\n'

    typescript_content += '];\n\n'

    # Add event type mappings
    typescript_content += 'export const gameEventTypes: Record<number, EventType> = {\n'
    for event_id, (type_id, name) in game_event_types.items():
        typescript_content += f'  {event_id}: {{ typeId: {type_id}, name: "{name}" }},\n'
    typescript_content += '};\n\n'

    typescript_content += 'export const messageEventTypes: Record<number, EventType> = {\n'
    for event_id, (type_id, name) in message_event_types.items():
        typescript_content += f'  {event_id}: {{ typeId: {type_id}, name: "{name}" }},\n'
    typescript_content += '};\n\n'

    typescript_content += 'export const trackerEventTypes: Record<number, EventType> = {\n'
    for event_id, (type_id, name) in tracker_event_types.items():
        typescript_content += f'  {event_id}: {{ typeId: {type_id}, name: "{name}" }},\n'
    typescript_content += '};\n\n'

    # Add constants
    typescript_content += '''// Important protocol type IDs
export const GAME_EVENTID_TYPEID = ''' + str(game_eventid_typeid) + ''';
export const MESSAGE_EVENTID_TYPEID = ''' + str(message_eventid_typeid) + ''';
export const TRACKER_EVENTID_TYPEID = ''' + str(tracker_eventid_typeid) + ''';
export const SVARUINT32_TYPEID = ''' + str(svaruint32_typeid) + ''';
export const REPLAY_USERID_TYPEID = ''' + str(replay_userid_typeid) + ''';
export const REPLAY_HEADER_TYPEID = ''' + str(replay_header_typeid) + ''';
export const GAME_DETAILS_TYPEID = ''' + str(game_details_typeid) + ''';
export const REPLAY_INITDATA_TYPEID = ''' + str(replay_initdata_typeid) + ''';

// Helper functions for protocol parsing
export function getTypeInfo(typeId: number): ProtocolTypeInfo | undefined {
  return protocolTypeinfos[typeId];
}

export function getGameEventType(eventId: number): EventType | undefined {
  return gameEventTypes[eventId];
}

export function getMessageEventType(eventId: number): EventType | undefined {
  return messageEventTypes[eventId];
}

export function getTrackerEventType(eventId: number): EventType | undefined {
  return trackerEventTypes[eventId];
}
'''

    return typescript_content

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--generate-file":
        # Generate TypeScript file
        content = generate_typescript_protocol_file()
        with open("protocol.ts", "w") as f:
            f.write(content)
        print("Generated protocol.ts file")
    else:
        # Print to console
        convert_typeinfos_to_typescript()
