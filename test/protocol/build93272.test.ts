import { getProtocol, isBuildSupported } from "@/protocol";

describe("Build 93272 Protocol Compatibility", () => {
  it("should be listed as a supported build version", () => {
    expect(isBuildSupported(93272)).toBe(true);
  });

  it("should map to protocol 80949", () => {
    const protocol = getProtocol(93272);
    expect(protocol.version).toBe(80949);
  });

  it("should have all required decoder methods", () => {
    const protocol = getProtocol(93272);

    // Verify all required protocol methods exist
    expect(typeof protocol.decodeReplayHeader).toBe("function");
    expect(typeof protocol.decodeReplayDetails).toBe("function");
    expect(typeof protocol.decodeReplayInitdata).toBe("function");
    expect(typeof protocol.decodeReplayGameEvents).toBe("function");
    expect(typeof protocol.decodeReplayMessageEvents).toBe("function");
    expect(typeof protocol.decodeReplayTrackerEvents).toBe("function");
    expect(typeof protocol.decodeReplayAttributesEvents).toBe("function");
  });
});
