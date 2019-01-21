
import * as qlog from "@quictools/qlog-schema/dist/draft-16/QLog";

export class PCAPUtil {

    public static getPacketType(packetType: number): qlog.PacketType {
        if (packetType == 0x7f)
            return qlog.PacketType.INITIAL;
        else if (packetType == 0x7e)
            return qlog.PacketType.RETRY;
        else if (packetType == 0x7d)
            return qlog.PacketType.HANDSHAKE;
        else if (packetType == 0x7c)
            return qlog.PacketType.ZERORTTPROTECTED;
        return qlog.PacketType.UNKOWN_PACKET_TYPE;
    }

    public static getFrameTypeName(frameType: number): qlog.FrameTypeName {
        if (frameType == 0x00)
            return qlog.FrameTypeName.PADDING;
        else if (frameType == 0x01)
            return qlog.FrameTypeName.RST_STREAM;
        else if (frameType == 0x02)
            return qlog.FrameTypeName.CONNECTION_CLOSE;
        else if (frameType == 0x03)
            return qlog.FrameTypeName.APPLICATION_CLOSE;
        else if (frameType == 0x04)
            return qlog.FrameTypeName.MAX_DATA;
        else if (frameType == 0x05)
            return qlog.FrameTypeName.MAX_STREAM_DATA;
        else if (frameType == 0x06)
            return qlog.FrameTypeName.MAX_STREAM_ID;
        else if (frameType == 0x07)
            return qlog.FrameTypeName.PING;
        else if (frameType == 0x08)
            return qlog.FrameTypeName.BLOCKED;
        else if (frameType == 0x09)
            return qlog.FrameTypeName.STREAM_BLOCKED;
        else if (frameType == 0x0a)
            return qlog.FrameTypeName.STREAM_ID_BLOCKED;
        else if (frameType == 0x0b)
            return qlog.FrameTypeName.NEW_CONNECTION_ID;
        else if (frameType == 0x0c)
            return qlog.FrameTypeName.STOP_SENDING;
        else if (frameType == 0x0d)
            return qlog.FrameTypeName.RETIRE_CONNECTION_ID;
        else if (frameType == 0x0e)
            return qlog.FrameTypeName.PATH_CHALLENGE;
        else if (frameType == 0x0f)
            return qlog.FrameTypeName.PATH_RESPONSE;
        else if (frameType >= 0x10 && frameType <= 0x17)
            return qlog.FrameTypeName.STREAM;
        else if (frameType == 0x18)
            return qlog.FrameTypeName.CRYPTO;
        else if (frameType == 0x19)
            return qlog.FrameTypeName.NEW_TOKEN;
        else if (frameType >= 0x1a && frameType <= 0x1b)
            return qlog.FrameTypeName.ACK;
        return qlog.FrameTypeName.UNKNOWN_FRAME_TYPE;
    }

}