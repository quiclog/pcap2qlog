export enum FrameTypeName {
    PADDING = "PADDING",
    RST_STREAM = "RST_STREAM",
    CONNECTION_CLOSE = "CONNECTION_CLOSE",
    APPLICATION_CLOSE = "APPLICATION_CLOSE",
    MAX_DATA = "MAX_DATA",
    MAX_STREAM_DATA = "MAX_STREAM_DATA",
    MAX_STREAM_ID = "MAX_STREAM_ID",
    PING = "PING",
    BLOCKED = "BLOCKED",
    STREAM_BLOCKED = "STREAM_BLOCKED",
    STREAM_ID_BLOCKED = "STREAM_ID_BLOCKED",
    NEW_CONNECTION_ID = "NEW_CONNECTION_ID",
    STOP_SENDING = "STOP_SENDING",
    RETIRE_CONNECTION_ID = "RETIRE_CONNECTION_ID",
    PATH_CHALLENGE = "PATCH_CHALLENGE",
    PATH_RESPONSE = "PATH_RESPONSE",
    STREAM = "STREAM",
    CRYPTO = "CRYPTO",
    NEW_TOKEN = "NEW TOKEN",
    ACK = "ACK",
    UNKNOWN_FRAME_TYPE = "UNKOWN_FRAME_TYPE",
}

export enum PacketType {
    INITIAL = "Initial",
    RETRY = "Retry",
    HANDSHAKE = "Handshake",
    ZERORTTPROTECTED = "0-RTT Protected",
    UNKOWN_PACKET_TYPE = "UNKOWN PACKET TYPE"
}

export class QUIC {

    public static getPacketType(packetType: number): PacketType {
        if (packetType == 0x7f)
            return PacketType.INITIAL;
        else if (packetType == 0x7e)
            return PacketType.RETRY;
        else if (packetType == 0x7d)
            return PacketType.HANDSHAKE;
        else if (packetType == 0x7c)
            return PacketType.ZERORTTPROTECTED;
        return PacketType.UNKOWN_PACKET_TYPE;
    }

    public static getFrameTypeName(frameType: number): FrameTypeName {
        if (frameType == 0x00)
            return FrameTypeName.PADDING;
        else if (frameType == 0x01)
            return FrameTypeName.RST_STREAM;
        else if (frameType == 0x02)
            return FrameTypeName.CONNECTION_CLOSE;
        else if (frameType == 0x03)
            return FrameTypeName.APPLICATION_CLOSE;
        else if (frameType == 0x04)
            return FrameTypeName.MAX_DATA;
        else if (frameType == 0x05)
            return FrameTypeName.MAX_STREAM_DATA;
        else if (frameType == 0x06)
            return FrameTypeName.MAX_STREAM_ID;
        else if (frameType == 0x07)
            return FrameTypeName.PING;
        else if (frameType == 0x08)
            return FrameTypeName.BLOCKED;
        else if (frameType == 0x09)
            return FrameTypeName.STREAM_BLOCKED;
        else if (frameType == 0x0a)
            return FrameTypeName.STREAM_ID_BLOCKED;
        else if (frameType == 0x0b)
            return FrameTypeName.NEW_CONNECTION_ID;
        else if (frameType == 0x0c)
            return FrameTypeName.STOP_SENDING;
        else if (frameType == 0x0d)
            return FrameTypeName.RETIRE_CONNECTION_ID;
        else if (frameType == 0x0e)
            return FrameTypeName.PATH_CHALLENGE;
        else if (frameType == 0x0f)
            return FrameTypeName.PATH_RESPONSE;
        else if (frameType >= 0x10 && frameType <= 0x17)
            return FrameTypeName.STREAM;
        else if (frameType == 0x18)
            return FrameTypeName.CRYPTO;
        else if (frameType == 0x19)
            return FrameTypeName.NEW_TOKEN;
        else if (frameType >= 0x1a && frameType <= 0x1b)
            return FrameTypeName.ACK;
        return FrameTypeName.UNKNOWN_FRAME_TYPE;
    }

}