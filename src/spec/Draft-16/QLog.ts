// ================================================================== //
// Interface for QLog version 0.1
// ================================================================== //

import {FrameTypeName} from "./QUIC";

export interface IQLog {
    qlog_version: string,
    quic_version: string,
    vantagepoint: VantagePoint,
    connectionid: string,
    starttime: number,
    fields: string[],
    events: [number, string, string, string, IEventData][]
}


// ================================================================== //

export enum VantagePoint {
    CLIENT = "CLIENT",
    SERVER = "SERVER",
    NETWORK = "NETWORK"
}

export enum SSLSecrets {
    QUIC_SERVER_HANDSHAKE_TRAFFIC_SECRET = "QUIC_SERVER_HANDSHAKE_TRAFFIC_SECRET",
    QUIC_CLIENT_HANDSHAKE_TRAFFIC_SECRET = "QUIC_CLIENT_HANDSHAKE_TRAFFIC_SECRET",
    QUIC_SERVER_TRAFFIC_SECRET = "QUIC_SERVER_TRAFFIC_SECRET",
    QUIC_CLIENT_TRAFFIC_SECRET = "QUIC_CLIENT_TRAFFIC_SECRET",
    ADDITIONAL_SECRET = "ADDITIONAL_SECRET"
}

// ================================================================== //
// Data Interfaces for QLog Events
// ================================================================== //

export interface IEventData {

}

export interface IEventNewConnection extends IEventData {
    ip_version: string,
    //TODO more restrictive types for IP?
    srcip: string,
    dstip: string,
    srcport: number,
    dstport: number,
}

// ================================================================== //

export interface IEventKeyUpdate extends IEventData {
    name: SSLSecrets,
    key: string
}

// ================================================================== //

export interface IEventPacketRX extends IEventData {
    raw_encrypted?: string
    header?: IEventPacketRXHeader,
    frames?: any[]
}

export interface IEventPacketRXHeader {
    form: string,
    type: string,
    version: string,
    scil: string,
    dcil: string,
    scid: string,
    dcid: string,
    payload_length: number,
    packet_numer: string
}

export interface IEventPacketRXFrame {
    type: FrameTypeName,
    length: number
}

// ================================================================== //

