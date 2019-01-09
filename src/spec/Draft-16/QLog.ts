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
    //TODO
    events: [
        number,
        EventCategory,
        ConnectivityEventType | TransportEventType | SecurityEventType,
        ConnectivityEventTrigger | TransporEventTrigger | SecurityEventTrigger,
        IEventData
        ][]
}

// ================================================================== //

export enum EventCategory {
    CONNECTIVITY = "CONNECTIVITY",
    SECURITY = "SECURITY",
    TRANSPORT = "TRANSPORT",
}

export enum ConnectivityEventType {
    NEW_CONNECTION = "NEW_CONNECTION",
}

export enum ConnectivityEventTrigger {
    LINE = "LINE"
}

export enum TransportEventType {
    TRANSPORT_PACKET_RX = "PACKET_RX",
}

export enum TransporEventTrigger {
    LINE = "LINE"
}

export enum SecurityEventType {
    KEY_UPDATE = "KEY_UPDATE"
}

export enum SecurityEventTrigger {
    KEYLOG = "KEYLOG",
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
    packet_number: string
}

export interface IEventPacketRXFrame {
    type: FrameTypeName,
    length: number
}

// ================================================================== //

