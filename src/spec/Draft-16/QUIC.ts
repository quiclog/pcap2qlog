export enum FrameTypeName {
    PADDING,
    RST_STREAM,
    CONNECTION_CLOSE,
    APPLICATION_CLOSE,
    MAX_DATA,
    MAX_STREAM_DATA,
    MAX_STREAM_ID,
    PING,
    BLOCKED,
    STREAM_BLOCKED,
    STREAM_ID_BLOCKED,
    NEW_CONNECTION_ID,
    STOP_SENDING,
    RETIRE_CONNECTION_ID,
    PATH_CHALLENGE,
    PATH_RESPONSE,
    STREAM,
    CRYPTO,
    NEW_TOKEN,
    ACK,
    UNKNOWN_FRAME_TYPE,
}

export class QUIC {

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